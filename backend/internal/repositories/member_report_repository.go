package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"sort"
	"time"

	"soydee-api/internal/dto"
	"soydee-api/pkg/utils"
)

const dateLayout = "2006-01-02"

func nullInt(v sql.NullInt64) *int {
	if !v.Valid {
		return nil
	}
	i := int(v.Int64)
	return &i
}

func nullFloat(v sql.NullFloat64) *float64 {
	if !v.Valid {
		return nil
	}
	f := v.Float64
	return &f
}

func nullString(v sql.NullString) *string {
	if !v.Valid {
		return nil
	}
	s := v.String
	return &s
}

// avgClock is a circular mean of clock times (minutes since midnight), so
// times straddling midnight average correctly: 23:30 and 00:30 -> 00:00.
func avgClock(minutes []int) *string {
	if len(minutes) == 0 {
		return nil
	}
	var sx, sy float64
	for _, m := range minutes {
		a := float64(m) / 1440 * 2 * math.Pi
		sx += math.Cos(a)
		sy += math.Sin(a)
	}
	a := math.Atan2(sy, sx)
	if a < 0 {
		a += 2 * math.Pi
	}
	avg := int(math.Round(a/(2*math.Pi)*1440)) % 1440
	s := fmt.Sprintf("%02d:%02d", avg/60, avg%60)
	return &s
}

// MemberReport implements GET /members/{id}/report — one aggregated payload
// (overview + body/food/activity/sleep breakdowns) for the member's own
// report page over [from, to] (both local-midnight dates, inclusive).
func (s *ReportRepository) MemberReport(ctx context.Context, mbID int, from, to time.Time) (*dto.MemberReportResponse, error) {
	days := int(math.Round(to.Sub(from).Hours()/24)) + 1
	resp := &dto.MemberReportResponse{
		Range: dto.MemberReportRange{From: from.Format(dateLayout), To: to.Format(dateLayout), Days: days},
	}

	var err error
	if resp.Body, err = s.reportBody(ctx, mbID, from, to); err != nil {
		return nil, err
	}
	if resp.Food, err = s.reportFood(ctx, mbID, from, to); err != nil {
		return nil, err
	}
	if resp.Activity, err = s.reportActivity(ctx, mbID, from, to); err != nil {
		return nil, err
	}
	if resp.Sleep, err = s.reportSleep(ctx, mbID, from, to); err != nil {
		return nil, err
	}

	// ---- overview ----
	ov := &resp.Overview
	ov.RangeDays = days
	if l := resp.Body.Latest; l != nil {
		ov.BMI, ov.BMIEval, ov.TDEE, ov.TDEETarget = l.BMI, l.BMIEval, l.TDEE, l.TDEETarget
	}
	ov.MealCount = resp.Food.MealCount
	ov.ByTrafficLight = resp.Food.ByTrafficLight
	ov.ActivityTotalMin = resp.Activity.TotalMin
	ov.SleepAvgHours = resp.Sleep.AvgHours

	logged, err := s.loggedDates(ctx, mbID, from, to)
	if err != nil {
		return nil, err
	}
	ov.LoggedDays = len(logged)
	if days > 0 {
		ov.ConsistencyPct = int(math.Round(float64(len(logged)) * 100 / float64(days)))
	}

	// Streak = consecutive logged days ending today (or yesterday, since
	// today may simply not be logged yet) — independent of the chosen range.
	today := utils.Today()
	recent, err := s.loggedDates(ctx, mbID, today.AddDate(0, 0, -400), today)
	if err != nil {
		return nil, err
	}
	cursor := today
	if !recent[cursor.Format(dateLayout)] {
		cursor = cursor.AddDate(0, 0, -1)
	}
	for recent[cursor.Format(dateLayout)] {
		ov.StreakDays++
		cursor = cursor.AddDate(0, 0, -1)
	}

	return resp, nil
}

// loggedDates returns the set of dates in [from, to] on which the member
// logged at least one food / activity / sleep record.
func (s *ReportRepository) loggedDates(ctx context.Context, mbID int, from, to time.Time) (map[string]bool, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT d FROM (
			SELECT dfd_date AS d FROM daily_food_record WHERE mb_id = ? AND dfd_date BETWEEN ? AND ?
			UNION
			SELECT dact_date FROM daily_activity_record WHERE mb_id = ? AND dact_date BETWEEN ? AND ?
			UNION
			SELECT dslp_date FROM daily_sleep_record WHERE mb_id = ? AND dslp_date BETWEEN ? AND ?
		) t`, mbID, from, to, mbID, from, to, mbID, from, to)
	if err != nil {
		return nil, fmt.Errorf("query logged dates: %w", err)
	}
	defer rows.Close()

	set := make(map[string]bool)
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			return nil, fmt.Errorf("scan logged date: %w", err)
		}
		set[d.Format(dateLayout)] = true
	}
	return set, rows.Err()
}

func (s *ReportRepository) reportBody(ctx context.Context, mbID int, from, to time.Time) (dto.MemberReportBody, error) {
	out := dto.MemberReportBody{History: []dto.ReportBodyPoint{}}

	const base = `
		SELECT h.mbh_record_date, s.mbs_weight, s.mbs_height, s.mbs_target, s.mbs_activity_level,
		       h.mbh_bmi, h.mbh_eval_result, h.mbh_bmr, h.mbh_tdee, h.mbh_tdee_target
		FROM member_bmr_history h
		JOIN member_body_stats s ON s.mbs_id = h.mbs_id
		WHERE h.mb_id = ?`

	scan := func(sc interface{ Scan(...interface{}) error }) (dto.ReportBodyPoint, error) {
		var (
			p                          dto.ReportBodyPoint
			d                          time.Time
			weight, height, level      sql.NullFloat64
			bmi, bmr, tdee, tdeeTarget sql.NullFloat64
			target, eval               sql.NullInt64
		)
		if err := sc.Scan(&d, &weight, &height, &target, &level, &bmi, &eval, &bmr, &tdee, &tdeeTarget); err != nil {
			return p, err
		}
		p = dto.ReportBodyPoint{
			Date: d.Format(dateLayout), Weight: nullFloat(weight), Height: nullFloat(height),
			Target: nullInt(target), ActivityLevel: nullFloat(level), BMI: nullFloat(bmi),
			BMIEval: nullInt(eval), BMR: nullFloat(bmr), TDEE: nullFloat(tdee), TDEETarget: nullFloat(tdeeTarget),
		}
		return p, nil
	}

	// Latest ever (not range-bound): the "current state" cards.
	latest, err := scan(s.db.QueryRowContext(ctx, base+` ORDER BY h.mbh_record_date DESC, h.mbh_id DESC LIMIT 1`, mbID))
	switch {
	case err == sql.ErrNoRows:
	case err != nil:
		return out, fmt.Errorf("query latest body: %w", err)
	default:
		out.Latest = &latest
	}

	rows, err := s.db.QueryContext(ctx, base+` AND h.mbh_record_date BETWEEN ? AND ? ORDER BY h.mbh_record_date, h.mbh_id`, mbID, from, to)
	if err != nil {
		return out, fmt.Errorf("query body history: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		p, err := scan(rows)
		if err != nil {
			return out, fmt.Errorf("scan body history: %w", err)
		}
		out.History = append(out.History, p)
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	if n := len(out.History); n >= 2 && out.History[0].Weight != nil && out.History[n-1].Weight != nil {
		change := math.Round((*out.History[n-1].Weight-*out.History[0].Weight)*10) / 10
		out.WeightChange = &change
	}
	return out, nil
}

func (s *ReportRepository) reportFood(ctx context.Context, mbID int, from, to time.Time) (dto.MemberReportFood, error) {
	out := dto.MemberReportFood{
		TopCategories: []dto.ReportFoodCategory{},
		ByMeal:        []dto.ReportMealCount{{MealType: 1}, {MealType: 2}, {MealType: 3}, {MealType: 4}},
		Daily:         []dto.ReportFoodDay{},
		Items:         []dto.ReportFoodItem{},
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT d.dfd_date, d.dfd_time, d.dfd_meal_type, d.dfd_food_name, d.dfd_amount, fc.fd_name, fc.fd_traffic_light
		FROM daily_food_record d
		LEFT JOIN food_category fc ON fc.fd_id = d.fd_id
		WHERE d.mb_id = ? AND d.dfd_date BETWEEN ? AND ?
		ORDER BY d.dfd_date DESC, d.dfd_time DESC, d.dfd_id DESC`, mbID, from, to)
	if err != nil {
		return out, fmt.Errorf("query food report: %w", err)
	}
	defer rows.Close()

	perDay := make(map[string]*dto.ReportFoodDay)
	perCat := make(map[string]*dto.ReportFoodCategory)
	for rows.Next() {
		var (
			d                         time.Time
			tm, name, amount, catName sql.NullString
			meal, light               sql.NullInt64
		)
		if err := rows.Scan(&d, &tm, &meal, &name, &amount, &catName, &light); err != nil {
			return out, fmt.Errorf("scan food report: %w", err)
		}
		key := d.Format(dateLayout)
		day := perDay[key]
		if day == nil {
			day = &dto.ReportFoodDay{Date: key}
			perDay[key] = day
		}
		day.Total++
		out.MealCount++

		switch light.Int64 {
		case 1:
			day.Green++
			out.ByTrafficLight.Green++
		case 2:
			day.Yellow++
			out.ByTrafficLight.Yellow++
		case 3:
			day.Red++
			out.ByTrafficLight.Red++
		}
		if meal.Valid && meal.Int64 >= 1 && meal.Int64 <= 4 {
			out.ByMeal[meal.Int64-1].Count++
		}
		if catName.Valid {
			c := perCat[catName.String]
			if c == nil {
				c = &dto.ReportFoodCategory{Name: catName.String, TrafficLight: nullInt(light)}
				perCat[catName.String] = c
			}
			c.Count++
		}

		if len(out.Items) < dto.ReportItemsCap {
			t := ""
			if tm.Valid && len(tm.String) >= 5 {
				t = tm.String[:5]
			}
			out.Items = append(out.Items, dto.ReportFoodItem{
				Date: key, Time: t, MealType: nullInt(meal), FoodName: nullString(name),
				Amount: nullString(amount), CategoryName: nullString(catName), TrafficLight: nullInt(light),
			})
		}
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	out.ItemsTotal = out.MealCount
	out.DaysLogged = len(perDay)
	if out.DaysLogged > 0 {
		out.AvgPerDay = round1(float64(out.MealCount) / float64(out.DaysLogged))
	}
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		key := d.Format(dateLayout)
		if day := perDay[key]; day != nil {
			out.Daily = append(out.Daily, *day)
		} else {
			out.Daily = append(out.Daily, dto.ReportFoodDay{Date: key})
		}
	}
	for _, c := range perCat {
		out.TopCategories = append(out.TopCategories, *c)
	}
	sort.Slice(out.TopCategories, func(i, j int) bool {
		a, b := out.TopCategories[i], out.TopCategories[j]
		if a.Count != b.Count {
			return a.Count > b.Count
		}
		return a.Name < b.Name
	})
	if len(out.TopCategories) > 5 {
		out.TopCategories = out.TopCategories[:5]
	}
	return out, nil
}

func (s *ReportRepository) reportActivity(ctx context.Context, mbID int, from, to time.Time) (dto.MemberReportActivity, error) {
	out := dto.MemberReportActivity{
		Daily:         []dto.ReportActivityDay{},
		ByCategory:    []dto.ReportActivityGroup{},
		TopActivities: []dto.ReportActivityGroup{},
		Items:         []dto.ReportActivityItem{},
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT r.dact_date, a.act_name, a.act_category, r.dact_detail, r.dact_duration_min, r.dact_distance_km
		FROM daily_activity_record r
		JOIN activity_master a ON a.act_id = r.act_id
		WHERE r.mb_id = ? AND r.dact_date BETWEEN ? AND ?
		ORDER BY r.dact_date DESC, r.dact_id DESC`, mbID, from, to)
	if err != nil {
		return out, fmt.Errorf("query activity report: %w", err)
	}
	defer rows.Close()

	perDay := make(map[string]*dto.ReportActivityDay)
	perCat := make(map[int]*dto.ReportActivityGroup)
	perAct := make(map[string]*dto.ReportActivityGroup)
	for rows.Next() {
		var (
			d        time.Time
			name     string
			category int
			detail   sql.NullString
			duration sql.NullInt64
			distance sql.NullFloat64
		)
		if err := rows.Scan(&d, &name, &category, &detail, &duration, &distance); err != nil {
			return out, fmt.Errorf("scan activity report: %w", err)
		}
		key := d.Format(dateLayout)
		mins := int(duration.Int64)

		day := perDay[key]
		if day == nil {
			day = &dto.ReportActivityDay{Date: key}
			perDay[key] = day
		}
		day.Minutes += mins
		out.Count++
		out.TotalMin += mins

		if distance.Valid {
			day.DistanceKm += distance.Float64
			out.TotalDistance += distance.Float64
			out.DistanceCount++
		}

		cat := perCat[category]
		if cat == nil {
			cat = &dto.ReportActivityGroup{Category: category}
			perCat[category] = cat
		}
		cat.Count++
		cat.Minutes += mins

		act := perAct[name]
		if act == nil {
			act = &dto.ReportActivityGroup{Name: name}
			perAct[name] = act
		}
		act.Count++
		act.Minutes += mins

		if len(out.Items) < dto.ReportItemsCap {
			out.Items = append(out.Items, dto.ReportActivityItem{
				Date: key, Name: name, Category: category, Detail: nullString(detail),
				DurationMin: nullInt(duration), DistanceKm: nullFloat(distance),
			})
		}
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	out.ItemsTotal = out.Count
	out.DaysActive = len(perDay)
	if out.DaysActive > 0 {
		out.AvgMinPerDay = round1(float64(out.TotalMin) / float64(out.DaysActive))
	}
	out.TotalDistance = round1(out.TotalDistance)
	if out.DistanceCount > 0 {
		out.AvgDistance = round1(out.TotalDistance / float64(out.DistanceCount))
	}
	for d := from; !d.After(to); d = d.AddDate(0, 0, 1) {
		key := d.Format(dateLayout)
		if day := perDay[key]; day != nil {
			day.DistanceKm = round1(day.DistanceKm)
			out.Daily = append(out.Daily, *day)
		} else {
			out.Daily = append(out.Daily, dto.ReportActivityDay{Date: key})
		}
	}
	for _, c := range perCat {
		out.ByCategory = append(out.ByCategory, *c)
	}
	sort.Slice(out.ByCategory, func(i, j int) bool { return out.ByCategory[i].Category < out.ByCategory[j].Category })
	for _, a := range perAct {
		out.TopActivities = append(out.TopActivities, *a)
	}
	sort.Slice(out.TopActivities, func(i, j int) bool {
		a, b := out.TopActivities[i], out.TopActivities[j]
		if a.Count != b.Count {
			return a.Count > b.Count
		}
		return a.Name < b.Name
	})
	if len(out.TopActivities) > 5 {
		out.TopActivities = out.TopActivities[:5]
	}
	return out, nil
}

func (s *ReportRepository) reportSleep(ctx context.Context, mbID int, from, to time.Time) (dto.MemberReportSleep, error) {
	out := dto.MemberReportSleep{
		ByEval:    make([]int, 3),
		ByQuality: make([]int, 3),
		Items:     []dto.ReportSleepItem{},
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT dslp_date, dslp_start_time, dslp_end_time, dslp_total_hours, dslp_eval_result, dslp_quality_score
		FROM daily_sleep_record
		WHERE mb_id = ? AND dslp_date BETWEEN ? AND ?
		ORDER BY dslp_date, dslp_id`, mbID, from, to)
	if err != nil {
		return out, fmt.Errorf("query sleep report: %w", err)
	}
	defer rows.Close()

	var (
		sumHours        float64
		hoursCount      int
		bedMin, wakeMin []int
	)
	for rows.Next() {
		var (
			d, start, end time.Time
			hours         sql.NullFloat64
			eval, quality sql.NullInt64
		)
		if err := rows.Scan(&d, &start, &end, &hours, &eval, &quality); err != nil {
			return out, fmt.Errorf("scan sleep report: %w", err)
		}
		out.Nights++
		out.Items = append(out.Items, dto.ReportSleepItem{
			Date: d.Format(dateLayout), Start: start.Format("2006-01-02 15:04"), End: end.Format("2006-01-02 15:04"),
			TotalHours: nullFloat(hours), Eval: nullInt(eval), Quality: nullInt(quality),
		})
		bedMin = append(bedMin, start.Hour()*60+start.Minute())
		wakeMin = append(wakeMin, end.Hour()*60+end.Minute())

		if hours.Valid {
			sumHours += hours.Float64
			hoursCount++
			if out.MaxHours == nil || hours.Float64 > *out.MaxHours {
				v := hours.Float64
				out.MaxHours = &v
			}
			if out.MinHours == nil || hours.Float64 < *out.MinHours {
				v := hours.Float64
				out.MinHours = &v
			}
		}
		if eval.Valid && eval.Int64 >= 1 && eval.Int64 <= 3 {
			out.ByEval[eval.Int64-1]++
		}
		if quality.Valid && quality.Int64 >= 1 && quality.Int64 <= 3 {
			out.ByQuality[quality.Int64-1]++
		}
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	if hoursCount > 0 {
		avg := round1(sumHours / float64(hoursCount))
		out.AvgHours = &avg
	}
	out.AvgBedtime = avgClock(bedMin)
	out.AvgWakeTime = avgClock(wakeMin)
	return out, nil
}
