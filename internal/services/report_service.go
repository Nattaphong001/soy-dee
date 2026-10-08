package services

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"soydee-api/internal/dto"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/pkg/utils"
)

// ReportService backs API_SPEC.md §10 (member dashboard + admin reports).
// It reads across several tables at once, so — unlike the single-table
// repositories — it talks to *sql.DB directly for its aggregate queries,
// reusing BodyStatsRepository/BmrRepository where a simple per-member list
// already exists.
type ReportService struct {
	db            *sql.DB
	bodyStatsRepo *repositories.BodyStatsRepository
	bmrRepo       *repositories.BmrRepository
}

func NewReportService(db *sql.DB, bodyStatsRepo *repositories.BodyStatsRepository, bmrRepo *repositories.BmrRepository) *ReportService {
	return &ReportService{db: db, bodyStatsRepo: bodyStatsRepo, bmrRepo: bmrRepo}
}

var bmiEvalLabels = map[int]string{
	models.BMIEvalUnderweight: "ผอม",
	models.BMIEvalNormal:      "ปกติ",
	models.BMIEvalOverweight:  "ท้วม",
	models.BMIEvalObese:       "อ้วน",
}

var sleepEvalLabels = map[int]string{
	models.SleepEvalTooLittle: "น้อยไป",
	models.SleepEvalJustRight: "พอดี",
	models.SleepEvalTooMuch:   "มากไป",
}

var sleepQualityLabels = map[int]string{
	models.SleepQualityPoor:   "แย่",
	models.SleepQualityMedium: "ปานกลาง",
	models.SleepQualityGood:   "ดี",
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}

// Dashboard implements API_SPEC.md §10.1.
func (s *ReportService) Dashboard(ctx context.Context, mbID int) (*dto.DashboardResponse, error) {
	resp := &dto.DashboardResponse{
		WeeklyActivityMinutes: make([]int, 7),
	}

	// Latest BMI/BMR
	row := s.db.QueryRowContext(ctx, `
		SELECT mbh_bmi, mbh_eval_result, mbh_bmr, mbh_tdee, mbh_tdee_target
		FROM member_bmr_history WHERE mb_id = ?
		ORDER BY mbh_record_date DESC, mbh_id DESC LIMIT 1`, mbID)
	if err := row.Scan(&resp.LatestBMI.Value, &resp.LatestBMI.EvalResult, &resp.LatestBMR.BMR, &resp.LatestBMR.TDEE, &resp.LatestBMR.TDEETarget); err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("query latest bmr: %w", err)
	}

	// time.Now().Truncate(24*time.Hour) truncates by absolute Unix duration,
	// not local calendar day, so it doesn't reliably land on local midnight
	// outside UTC — use utils.Today() instead (see ParseDate for the same
	// class of bug against DATE-column equality).
	today := utils.Today()

	// Today's food summary
	row = s.db.QueryRowContext(ctx, `
		SELECT COUNT(*),
		       COALESCE(SUM(CASE WHEN fc.fd_traffic_light = 1 THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN fc.fd_traffic_light = 2 THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN fc.fd_traffic_light = 3 THEN 1 ELSE 0 END), 0)
		FROM daily_food_record d
		LEFT JOIN food_category fc ON fc.fd_id = d.fd_id
		WHERE d.mb_id = ? AND d.dfd_date = ?`, mbID, today)
	if err := row.Scan(&resp.TodayFoodSummary.MealCount, &resp.TodayFoodSummary.ByTrafficLight.Green,
		&resp.TodayFoodSummary.ByTrafficLight.Yellow, &resp.TodayFoodSummary.ByTrafficLight.Red); err != nil {
		return nil, fmt.Errorf("query today food summary: %w", err)
	}

	// Today's activity summary
	var totalMin float64
	row = s.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(dact_duration_min), 0)
		FROM daily_activity_record WHERE mb_id = ? AND dact_date = ?`, mbID, today)
	if err := row.Scan(&resp.TodayActivitySummary.ActivityCount, &totalMin); err != nil {
		return nil, fmt.Errorf("query today activity summary: %w", err)
	}
	resp.TodayActivitySummary.TotalDurationMin = int(totalMin)

	// Last sleep record
	var lastSleep dto.LastSleepSummary
	var lastSleepDate sql.NullTime
	row = s.db.QueryRowContext(ctx, `
		SELECT dslp_date, dslp_total_hours, dslp_quality_score
		FROM daily_sleep_record WHERE mb_id = ?
		ORDER BY dslp_date DESC, dslp_id DESC LIMIT 1`, mbID)
	err := row.Scan(&lastSleepDate, &lastSleep.TotalHours, &lastSleep.QualityScore)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("query last sleep: %w", err)
	}
	if err == nil {
		dateStr := lastSleepDate.Time.Format("2006-01-02")
		lastSleep.Date = &dateStr
		resp.LastSleep = &lastSleep
	}

	// Weekly activity minutes, oldest -> today.
	weekStart := today.AddDate(0, 0, -6)
	rows, err := s.db.QueryContext(ctx, `
		SELECT dact_date, COALESCE(SUM(dact_duration_min), 0)
		FROM daily_activity_record
		WHERE mb_id = ? AND dact_date BETWEEN ? AND ?
		GROUP BY dact_date`, mbID, weekStart, today)
	if err != nil {
		return nil, fmt.Errorf("query weekly activity: %w", err)
	}
	defer rows.Close()

	byDate := make(map[string]int)
	for rows.Next() {
		var d time.Time
		var min float64
		if err := rows.Scan(&d, &min); err != nil {
			return nil, fmt.Errorf("scan weekly activity: %w", err)
		}
		byDate[d.Format("2006-01-02")] = int(min)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := 0; i < 7; i++ {
		day := weekStart.AddDate(0, 0, i).Format("2006-01-02")
		resp.WeeklyActivityMinutes[i] = byDate[day]
	}

	return resp, nil
}

// reportFilter holds the common ?from&to&mb_id query params shared by every
// /admin/reports?type= variant (API_SPEC.md §10.2), plus type-specific
// optional filters added for the admin panel's per-report filter forms:
// Gender/BmiEval (bmi), TrafficLight/MealType (food), ActID (activity — the
// activity TYPE being filtered on, distinct from MbID which filters by which
// MEMBER logged the record), SleepEval (sleep, filters daily_sleep_record's
// own dslp_eval_result column).
type ReportFilter struct {
	From         *time.Time
	To           *time.Time
	MbID         *int
	Gender       *int
	BmiEval      *int
	TrafficLight *int
	MealType     *int
	ActID        *int
	SleepEval    *int
	Page         int
	Limit        int
}

// whereCond is one optional "column = ?" clause — included only when Value
// is non-nil. Lets each report type layer its own filters onto the shared
// from/to/mb_id ones without every function hand-rolling clause-building.
type whereCond struct {
	Column string
	Value  *int
}

// whereAndArgs builds a WHERE clause. Both columns must be table-qualified
// (e.g. "d.mb_id") since every caller here joins against member_profile,
// which also has an mb_id column — an unqualified "mb_id = ?" would be
// ambiguous once that join is in scope.
func (f ReportFilter) whereAndArgs(dateColumn, mbIDColumn string, extra ...whereCond) (string, []interface{}) {
	var clauses []string
	var args []interface{}
	if f.From != nil {
		clauses = append(clauses, dateColumn+" >= ?")
		args = append(args, *f.From)
	}
	if f.To != nil {
		clauses = append(clauses, dateColumn+" <= ?")
		args = append(args, *f.To)
	}
	if f.MbID != nil {
		clauses = append(clauses, mbIDColumn+" = ?")
		args = append(args, *f.MbID)
	}
	for _, c := range extra {
		if c.Value != nil {
			clauses = append(clauses, c.Column+" = ?")
			args = append(args, *c.Value)
		}
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(clauses, " AND "), args
}

// topCounts runs a "GROUP BY ... ORDER BY cnt DESC LIMIT 5"-shaped query
// whose SELECT list is exactly (label, count) and returns it as
// []dto.TopCountItem — shared by the food/activity top-5 breakdowns.
func (s *ReportService) topCounts(ctx context.Context, query string, args []interface{}) ([]dto.TopCountItem, error) {
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]dto.TopCountItem, 0, 5)
	for rows.Next() {
		var it dto.TopCountItem
		if err := rows.Scan(&it.Name, &it.Count); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (s *ReportService) AdminReport(ctx context.Context, reportType string, f ReportFilter) (*dto.AdminReportResponse, error) {
	switch reportType {
	case "bmi":
		return s.bmiReport(ctx, f)
	case "food":
		return s.foodReport(ctx, f)
	case "activity":
		return s.activityReport(ctx, f)
	case "sleep":
		return s.sleepReport(ctx, f)
	case "members":
		return s.membersReport(ctx, f)
	default:
		return nil, fmt.Errorf("unknown report type %q", reportType)
	}
}

func (s *ReportService) bmiReport(ctx context.Context, f ReportFilter) (*dto.AdminReportResponse, error) {
	// One row per member: the latest reading inside [from, to] (PK tiebreak for
	// same-day rows). Gender / eval / mb_id then filter that latest reading, so a
	// member is counted once — total = number of members, not history rows.
	var dateClauses, clauses []string
	var args []interface{}
	if f.From != nil {
		dateClauses = append(dateClauses, " AND h2.mbh_record_date >= ?")
		args = append(args, *f.From)
	}
	if f.To != nil {
		dateClauses = append(dateClauses, " AND h2.mbh_record_date <= ?")
		args = append(args, *f.To)
	}
	clauses = append(clauses, `h.mbh_id = (SELECT h2.mbh_id FROM member_bmr_history h2 WHERE h2.mb_id = h.mb_id`+
		strings.Join(dateClauses, "")+` ORDER BY h2.mbh_record_date DESC, h2.mbh_id DESC LIMIT 1)`)
	if f.MbID != nil {
		clauses = append(clauses, "h.mb_id = ?")
		args = append(args, *f.MbID)
	}
	if f.Gender != nil {
		clauses = append(clauses, "mp.mb_gender = ?")
		args = append(args, *f.Gender)
	}
	if f.BmiEval != nil {
		clauses = append(clauses, "h.mbh_eval_result = ?")
		args = append(args, *f.BmiEval)
	}
	const from = ` FROM member_bmr_history h JOIN member_profile mp ON mp.mb_id = h.mb_id WHERE `
	where := strings.Join(clauses, " AND ")

	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*)`+from+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count bmi report: %w", err)
	}

	summary := map[string]int{}
	for _, label := range []string{bmiEvalLabels[models.BMIEvalUnderweight], bmiEvalLabels[models.BMIEvalNormal],
		bmiEvalLabels[models.BMIEvalOverweight], bmiEvalLabels[models.BMIEvalObese]} {
		summary[label] = 0
	}
	sumRows, err := s.db.QueryContext(ctx, `SELECT h.mbh_eval_result, COUNT(*)`+from+where+` GROUP BY h.mbh_eval_result`, args...)
	if err != nil {
		return nil, fmt.Errorf("summarize bmi report: %w", err)
	}
	for sumRows.Next() {
		var eval, count int
		if err := sumRows.Scan(&eval, &count); err != nil {
			sumRows.Close()
			return nil, fmt.Errorf("scan bmi summary: %w", err)
		}
		if label, ok := bmiEvalLabels[eval]; ok {
			summary[label] = count
		}
	}
	sumRows.Close()
	if err := sumRows.Err(); err != nil {
		return nil, err
	}

	query := `
		SELECT h.mb_id, mp.mb_full_name, h.mbh_bmi, h.mbh_eval_result, h.mbh_record_date` + from + where + `
		ORDER BY h.mbh_record_date DESC, h.mbh_id DESC
		LIMIT ? OFFSET ?`
	rows, err := s.db.QueryContext(ctx, query, append(args, f.Limit, offsetOf(f))...)
	if err != nil {
		return nil, fmt.Errorf("list bmi report: %w", err)
	}
	defer rows.Close()

	items := make([]dto.BMIReportItem, 0)
	for rows.Next() {
		var it dto.BMIReportItem
		var recordDate time.Time
		if err := rows.Scan(&it.MbID, &it.MbFullName, &it.MbhBMI, &it.MbhEvalResult, &recordDate); err != nil {
			return nil, fmt.Errorf("scan bmi report item: %w", err)
		}
		it.MbhRecordDate = recordDate.Format("2006-01-02")
		items = append(items, it)
	}

	return &dto.AdminReportResponse{Type: "bmi", Range: rangeOf(f), Summary: summary, Items: items, Page: f.Page, Limit: f.Limit, Total: total}, nil
}

func (s *ReportService) foodReport(ctx context.Context, f ReportFilter) (*dto.AdminReportResponse, error) {
	where, args := f.whereAndArgs("d.dfd_date", "d.mb_id",
		whereCond{"fc.fd_traffic_light", f.TrafficLight},
		whereCond{"d.dfd_meal_type", f.MealType},
	)
	// Filtering on fc.fd_traffic_light needs food_category joined even in
	// the count query (the summary/item-list queries below already join it).
	const joinCategory = ` LEFT JOIN food_category fc ON fc.fd_id = d.fd_id`

	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM daily_food_record d`+joinCategory+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count food report: %w", err)
	}

	var tlc dto.TrafficLightCounts
	var uncategorized int
	sumRow := s.db.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(CASE WHEN fc.fd_traffic_light = 1 THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN fc.fd_traffic_light = 2 THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN fc.fd_traffic_light = 3 THEN 1 ELSE 0 END), 0),
		       COALESCE(SUM(CASE WHEN fc.fd_traffic_light IS NULL THEN 1 ELSE 0 END), 0)
		FROM daily_food_record d`+joinCategory+where, args...)
	if err := sumRow.Scan(&tlc.Green, &tlc.Yellow, &tlc.Red, &uncategorized); err != nil {
		return nil, fmt.Errorf("summarize food report: %w", err)
	}

	// Top-5 food categories — inner join so uncategorized records (fd_id
	// NULL, or pointing at a deleted category) don't show up as a blank row.
	topCategories, err := s.topCounts(ctx, `
		SELECT fc.fd_name, COUNT(*) AS cnt
		FROM daily_food_record d JOIN food_category fc ON fc.fd_id = d.fd_id`+where+`
		GROUP BY fc.fd_id, fc.fd_name
		ORDER BY cnt DESC
		LIMIT 5`, args)
	if err != nil {
		return nil, fmt.Errorf("top food categories: %w", err)
	}

	summary := dto.FoodReportSummary{TrafficLightCounts: tlc, Uncategorized: uncategorized, TopCategories: topCategories}

	query := `
		SELECT d.mb_id, mp.mb_full_name, d.dfd_id, d.dfd_date, COALESCE(d.dfd_food_name, ''),
		       d.fd_id, COALESCE(fc.fd_name, ''), fc.fd_traffic_light
		FROM daily_food_record d
		JOIN member_profile mp ON mp.mb_id = d.mb_id
		LEFT JOIN food_category fc ON fc.fd_id = d.fd_id` + where + `
		ORDER BY d.dfd_date DESC
		LIMIT ? OFFSET ?`
	rows, err := s.db.QueryContext(ctx, query, append(args, f.Limit, offsetOf(f))...)
	if err != nil {
		return nil, fmt.Errorf("list food report: %w", err)
	}
	defer rows.Close()

	items := make([]dto.FoodReportItem, 0)
	for rows.Next() {
		var it dto.FoodReportItem
		var recordDate time.Time
		if err := rows.Scan(&it.MbID, &it.MbFullName, &it.DfdID, &recordDate, &it.DfdFoodName, &it.FdID, &it.FdName, &it.FdTrafficLight); err != nil {
			return nil, fmt.Errorf("scan food report item: %w", err)
		}
		it.DfdDate = recordDate.Format("2006-01-02")
		items = append(items, it)
	}

	return &dto.AdminReportResponse{Type: "food", Range: rangeOf(f), Summary: summary, Items: items, Page: f.Page, Limit: f.Limit, Total: total}, nil
}

func (s *ReportService) activityReport(ctx context.Context, f ReportFilter) (*dto.AdminReportResponse, error) {
	where, args := f.whereAndArgs("d.dact_date", "d.mb_id", whereCond{"d.act_id", f.ActID})

	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM daily_activity_record d`+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count activity report: %w", err)
	}

	var activityCount int
	var totalMin float64
	sumRow := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*), COALESCE(SUM(d.dact_duration_min), 0)
		FROM daily_activity_record d`+where, args...)
	if err := sumRow.Scan(&activityCount, &totalMin); err != nil {
		return nil, fmt.Errorf("summarize activity report: %w", err)
	}

	topActivities, err := s.topCounts(ctx, `
		SELECT am.act_name, COUNT(*) AS cnt
		FROM daily_activity_record d JOIN activity_master am ON am.act_id = d.act_id`+where+`
		GROUP BY am.act_id, am.act_name
		ORDER BY cnt DESC
		LIMIT 5`, args)
	if err != nil {
		return nil, fmt.Errorf("top activities: %w", err)
	}

	summary := dto.ActivityReportSummary{
		ActivityCount:    activityCount,
		TotalDurationMin: int(totalMin),
		TopActivities:    topActivities,
	}

	query := `
		SELECT d.mb_id, mp.mb_full_name, d.dact_id, d.dact_date, d.act_id, am.act_name,
		       COALESCE(d.dact_duration_min, 0)
		FROM daily_activity_record d
		JOIN member_profile mp ON mp.mb_id = d.mb_id
		JOIN activity_master am ON am.act_id = d.act_id` + where + `
		ORDER BY d.dact_date DESC
		LIMIT ? OFFSET ?`
	rows, err := s.db.QueryContext(ctx, query, append(args, f.Limit, offsetOf(f))...)
	if err != nil {
		return nil, fmt.Errorf("list activity report: %w", err)
	}
	defer rows.Close()

	items := make([]dto.ActivityReportItem, 0)
	for rows.Next() {
		var it dto.ActivityReportItem
		var recordDate time.Time
		var minutes float64
		if err := rows.Scan(&it.MbID, &it.MbFullName, &it.DactID, &recordDate, &it.ActID, &it.ActName, &minutes); err != nil {
			return nil, fmt.Errorf("scan activity report item: %w", err)
		}
		it.DactDate = recordDate.Format("2006-01-02")
		it.DurationMinutes = int(minutes)
		items = append(items, it)
	}

	return &dto.AdminReportResponse{Type: "activity", Range: rangeOf(f), Summary: summary, Items: items, Page: f.Page, Limit: f.Limit, Total: total}, nil
}

func (s *ReportService) sleepReport(ctx context.Context, f ReportFilter) (*dto.AdminReportResponse, error) {
	// dslp_eval_result filter is a distinct axis from the quality_score
	// summary below — a caller narrows to (say) "too little sleep" nights
	// via ?eval= and still gets a quality breakdown of just those nights.
	where, args := f.whereAndArgs("d.dslp_date", "d.mb_id", whereCond{"d.dslp_eval_result", f.SleepEval})

	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM daily_sleep_record d`+where, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count sleep report: %w", err)
	}

	var avgHours sql.NullFloat64
	if err := s.db.QueryRowContext(ctx, `SELECT AVG(d.dslp_total_hours) FROM daily_sleep_record d`+where, args...).Scan(&avgHours); err != nil {
		return nil, fmt.Errorf("average sleep hours: %w", err)
	}

	// Bug fix: this used to GROUP BY dslp_eval_result (น้อยไป/พอดี/มากไป) and
	// label it as if it were the "quality" breakdown the task spec asks for
	// (แย่/ปานกลาง/ดี, keyed off dslp_quality_score) — wrong column entirely.
	qualityBreakdown := map[string]int{
		sleepQualityLabels[models.SleepQualityPoor]:   0,
		sleepQualityLabels[models.SleepQualityMedium]: 0,
		sleepQualityLabels[models.SleepQualityGood]:   0,
	}
	sumRows, err := s.db.QueryContext(ctx, `SELECT d.dslp_quality_score, COUNT(*) FROM daily_sleep_record d`+where+` GROUP BY d.dslp_quality_score`, args...)
	if err != nil {
		return nil, fmt.Errorf("summarize sleep report: %w", err)
	}
	for sumRows.Next() {
		var quality sql.NullInt64
		var count int
		if err := sumRows.Scan(&quality, &count); err != nil {
			sumRows.Close()
			return nil, fmt.Errorf("scan sleep summary: %w", err)
		}
		if quality.Valid {
			if label, ok := sleepQualityLabels[int(quality.Int64)]; ok {
				qualityBreakdown[label] = count
			}
		}
	}
	sumRows.Close()
	if err := sumRows.Err(); err != nil {
		return nil, err
	}

	summary := dto.SleepReportSummary{AvgSleepHours: round1(avgHours.Float64), QualityBreakdown: qualityBreakdown}

	query := `
		SELECT d.mb_id, mp.mb_full_name, d.dslp_id, d.dslp_date,
		       COALESCE(d.dslp_total_hours, 0), COALESCE(d.dslp_eval_result, '0'), COALESCE(d.dslp_quality_score, 0)
		FROM daily_sleep_record d
		JOIN member_profile mp ON mp.mb_id = d.mb_id` + where + `
		ORDER BY d.dslp_date DESC
		LIMIT ? OFFSET ?`
	rows, err := s.db.QueryContext(ctx, query, append(args, f.Limit, offsetOf(f))...)
	if err != nil {
		return nil, fmt.Errorf("list sleep report: %w", err)
	}
	defer rows.Close()

	items := make([]dto.SleepReportItem, 0)
	for rows.Next() {
		var it dto.SleepReportItem
		var recordDate time.Time
		var evalRaw string
		if err := rows.Scan(&it.MbID, &it.MbFullName, &it.DslpID, &recordDate, &it.DslpTotalHours, &evalRaw, &it.DslpQualityScore); err != nil {
			return nil, fmt.Errorf("scan sleep report item: %w", err)
		}
		it.DslpDate = recordDate.Format("2006-01-02")
		it.DslpEvalResult, _ = strconv.Atoi(evalRaw)
		items = append(items, it)
	}

	return &dto.AdminReportResponse{Type: "sleep", Range: rangeOf(f), Summary: summary, Items: items, Page: f.Page, Limit: f.Limit, Total: total}, nil
}

func (s *ReportService) membersReport(ctx context.Context, f ReportFilter) (*dto.AdminReportResponse, error) {
	items, total, err := s.ListMembers(ctx, MemberListFilter{}, f.Limit, offsetOf(f))
	if err != nil {
		return nil, err
	}
	return &dto.AdminReportResponse{Type: "members", Summary: map[string]int{"total_members": total}, Items: items, Page: f.Page, Limit: f.Limit, Total: total}, nil
}

// MemberListFilter holds GET /admin/members's optional filters (task spec:
// free-text search plus gender / BMI-category / registration-date-range).
type MemberListFilter struct {
	Search  string
	Gender  *int
	BmiEval *int
	From    *time.Time
	To      *time.Time
}

// latestBmrSubquery/latestBodyStatsSubquery pick one member's most recent
// history row via PK-tiebreak (not MAX(date) then re-join, which double
// counts when two rows share a date — see the bmi/food/activity/sleep
// report functions' git history for the real case that caught this).
const latestBmiSubquery = `(SELECT h.mbh_bmi FROM member_bmr_history h WHERE h.mb_id = mp.mb_id ORDER BY h.mbh_record_date DESC, h.mbh_id DESC LIMIT 1)`
const latestBmiEvalSubquery = `(SELECT h.mbh_eval_result FROM member_bmr_history h WHERE h.mb_id = mp.mb_id ORDER BY h.mbh_record_date DESC, h.mbh_id DESC LIMIT 1)`

// ListMembers backs GET /admin/members (API_SPEC.md §10.3).
func (s *ReportService) ListMembers(ctx context.Context, f MemberListFilter, limit, offset int) ([]dto.AdminMemberSummary, int, error) {
	var clauses []string
	var args []interface{}
	if f.Search != "" {
		clauses = append(clauses, "(mp.mb_user_name LIKE ? OR mp.mb_full_name LIKE ?)")
		like := "%" + f.Search + "%"
		args = append(args, like, like)
	}
	if f.Gender != nil {
		clauses = append(clauses, "mp.mb_gender = ?")
		args = append(args, *f.Gender)
	}
	if f.BmiEval != nil {
		clauses = append(clauses, latestBmiEvalSubquery+" = ?")
		args = append(args, *f.BmiEval)
	}
	if f.From != nil {
		clauses = append(clauses, "mp.mb_created_at >= ?")
		args = append(args, *f.From)
	}
	if f.To != nil {
		clauses = append(clauses, "mp.mb_created_at < ?")
		args = append(args, f.To.AddDate(0, 0, 1))
	}
	where := ""
	if len(clauses) > 0 {
		where = " WHERE " + strings.Join(clauses, " AND ")
	}

	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM member_profile mp`+where, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count members: %w", err)
	}

	query := `
		SELECT mp.mb_id, mp.mb_user_name, mp.mb_full_name, mp.mb_gender, mp.mb_profile_pic,
		       TIMESTAMPDIFF(YEAR, mp.mb_birth_date, CURDATE()) AS age,
		       (SELECT bs.mbs_weight FROM member_body_stats bs WHERE bs.mb_id = mp.mb_id ORDER BY bs.mbs_recorded_date DESC, bs.mbs_id DESC LIMIT 1) AS mbs_weight,
		       (SELECT bs.mbs_height FROM member_body_stats bs WHERE bs.mb_id = mp.mb_id ORDER BY bs.mbs_recorded_date DESC, bs.mbs_id DESC LIMIT 1) AS mbs_height,
		       (SELECT bs.mbs_target FROM member_body_stats bs WHERE bs.mb_id = mp.mb_id ORDER BY bs.mbs_recorded_date DESC, bs.mbs_id DESC LIMIT 1) AS mbs_target,
		       ` + latestBmiSubquery + ` AS latest_bmi,
		       ` + latestBmiEvalSubquery + ` AS mbh_eval_result,
		       mp.mb_created_at
		FROM member_profile mp` + where + `
		ORDER BY mp.mb_id
		LIMIT ? OFFSET ?`
	rows, err := s.db.QueryContext(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("list members: %w", err)
	}
	defer rows.Close()

	items := make([]dto.AdminMemberSummary, 0)
	for rows.Next() {
		var m dto.AdminMemberSummary
		var createdAt time.Time
		if err := rows.Scan(&m.MbID, &m.MbUserName, &m.MbFullName, &m.MbGender, &m.MbProfilePic,
			&m.Age, &m.MbsWeight, &m.MbsHeight, &m.MbsTarget, &m.LatestBMI, &m.MbhEvalResult, &createdAt); err != nil {
			return nil, 0, fmt.Errorf("scan member: %w", err)
		}
		m.MbCreatedAt = createdAt.Format(time.RFC3339)
		items = append(items, m)
	}
	return items, total, rows.Err()
}

// MemberDetail backs GET /admin/members/{id} (API_SPEC.md §10.4).
func (s *ReportService) MemberDetail(ctx context.Context, mbID int) (*dto.AdminMemberDetail, error) {
	var profile dto.AdminMemberSummary
	var createdAt time.Time
	row := s.db.QueryRowContext(ctx, `
		SELECT mp.mb_id, mp.mb_user_name, mp.mb_full_name, mp.mb_gender, mp.mb_profile_pic,
		       TIMESTAMPDIFF(YEAR, mp.mb_birth_date, CURDATE()) AS age,
		       (SELECT bs.mbs_weight FROM member_body_stats bs WHERE bs.mb_id = mp.mb_id ORDER BY bs.mbs_recorded_date DESC, bs.mbs_id DESC LIMIT 1) AS mbs_weight,
		       (SELECT bs.mbs_height FROM member_body_stats bs WHERE bs.mb_id = mp.mb_id ORDER BY bs.mbs_recorded_date DESC, bs.mbs_id DESC LIMIT 1) AS mbs_height,
		       (SELECT bs.mbs_target FROM member_body_stats bs WHERE bs.mb_id = mp.mb_id ORDER BY bs.mbs_recorded_date DESC, bs.mbs_id DESC LIMIT 1) AS mbs_target,
		       `+latestBmiSubquery+` AS latest_bmi,
		       `+latestBmiEvalSubquery+` AS mbh_eval_result,
		       mp.mb_created_at
		FROM member_profile mp WHERE mp.mb_id = ?`, mbID)
	if err := row.Scan(&profile.MbID, &profile.MbUserName, &profile.MbFullName, &profile.MbGender, &profile.MbProfilePic,
		&profile.Age, &profile.MbsWeight, &profile.MbsHeight, &profile.MbsTarget, &profile.LatestBMI, &profile.MbhEvalResult, &createdAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, repositories.ErrNotFound
		}
		return nil, fmt.Errorf("scan member profile: %w", err)
	}
	profile.MbCreatedAt = createdAt.Format(time.RFC3339)

	bodyStats, err := s.bodyStatsRepo.ListByMember(ctx, mbID)
	if err != nil {
		return nil, fmt.Errorf("list body stats: %w", err)
	}
	bmrHistory, _, err := s.bmrRepo.ListByMember(ctx, mbID, nil, nil, 20, 0)
	if err != nil {
		return nil, fmt.Errorf("list bmr history: %w", err)
	}

	foodRows, err := s.db.QueryContext(ctx, `
		SELECT dfd_id, dfd_date, dfd_time, COALESCE(dfd_food_name,''), fd_id
		FROM daily_food_record WHERE mb_id = ? ORDER BY dfd_date DESC, dfd_id DESC LIMIT 10`, mbID)
	if err != nil {
		return nil, fmt.Errorf("list recent food records: %w", err)
	}
	defer foodRows.Close()
	type recentFood struct {
		DfdID int    `json:"dfd_id"`
		Date  string `json:"dfd_date"`
		Time  string `json:"dfd_time"`
		Name  string `json:"dfd_food_name"`
		FdID  *int   `json:"fd_id"`
	}
	foodItems := make([]recentFood, 0)
	for foodRows.Next() {
		var it recentFood
		var d time.Time
		if err := foodRows.Scan(&it.DfdID, &d, &it.Time, &it.Name, &it.FdID); err != nil {
			return nil, fmt.Errorf("scan recent food record: %w", err)
		}
		it.Date = d.Format("2006-01-02")
		foodItems = append(foodItems, it)
	}

	return &dto.AdminMemberDetail{
		Profile:    profile,
		BodyStats:  bodyStats,
		BmrHistory: bmrHistory,
		FoodRecent: foodItems,
	}, nil
}

// Stats backs GET /admin/stats (API_SPEC.md §10.5) — the admin panel's
// system-overview landing page: member/category counts plus a 7-day daily
// series across all three record types.
func (s *ReportService) Stats(ctx context.Context) (*dto.AdminStatsResponse, error) {
	resp := &dto.AdminStatsResponse{}

	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM member_profile`).Scan(&resp.TotalMembers); err != nil {
		return nil, fmt.Errorf("count members: %w", err)
	}
	if err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM member_profile WHERE YEAR(mb_created_at) = YEAR(CURDATE()) AND MONTH(mb_created_at) = MONTH(CURDATE())`,
	).Scan(&resp.NewMembersThisMonth); err != nil {
		return nil, fmt.Errorf("count new members this month: %w", err)
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM food_category`).Scan(&resp.FoodCategoryCount); err != nil {
		return nil, fmt.Errorf("count food categories: %w", err)
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM activity_master`).Scan(&resp.ActivityCount); err != nil {
		return nil, fmt.Errorf("count activities: %w", err)
	}

	foodByDate, err := s.countByDateLast7Days(ctx, "daily_food_record", "dfd_date")
	if err != nil {
		return nil, fmt.Errorf("food records by date: %w", err)
	}
	activityByDate, err := s.countByDateLast7Days(ctx, "daily_activity_record", "dact_date")
	if err != nil {
		return nil, fmt.Errorf("activity records by date: %w", err)
	}
	sleepByDate, err := s.countByDateLast7Days(ctx, "daily_sleep_record", "dslp_date")
	if err != nil {
		return nil, fmt.Errorf("sleep records by date: %w", err)
	}

	today := utils.Today()
	resp.DailyRecords = make([]dto.DailyRecordCount, 0, 7)
	for i := 6; i >= 0; i-- {
		d := today.AddDate(0, 0, -i).Format("2006-01-02")
		resp.DailyRecords = append(resp.DailyRecords, dto.DailyRecordCount{
			Date:     d,
			Food:     foodByDate[d],
			Activity: activityByDate[d],
			Sleep:    sleepByDate[d],
		})
	}

	return resp, nil
}

// countByDateLast7Days counts rows per day over the last 7 days (today
// inclusive) for one table/date-column pair. table and dateColumn are always
// literal constants passed by Stats above, never request input, so building
// the query by concatenation here carries no injection risk.
func (s *ReportService) countByDateLast7Days(ctx context.Context, table, dateColumn string) (map[string]int, error) {
	query := `SELECT ` + dateColumn + `, COUNT(*) FROM ` + table + `
	          WHERE ` + dateColumn + ` >= CURDATE() - INTERVAL 6 DAY
	          GROUP BY ` + dateColumn

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := map[string]int{}
	for rows.Next() {
		var d time.Time
		var count int
		if err := rows.Scan(&d, &count); err != nil {
			return nil, err
		}
		result[d.Format("2006-01-02")] = count
	}
	return result, rows.Err()
}

func offsetOf(f ReportFilter) int {
	if f.Page <= 1 {
		return 0
	}
	return (f.Page - 1) * f.Limit
}

func rangeOf(f ReportFilter) *dto.DateRange {
	if f.From == nil && f.To == nil {
		return nil
	}
	r := &dto.DateRange{}
	if f.From != nil {
		r.From = f.From.Format("2006-01-02")
	}
	if f.To != nil {
		r.To = f.To.Format("2006-01-02")
	}
	return r
}
