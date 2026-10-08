package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"soydee-api/internal/models"
	"soydee-api/pkg/utils"
)

type BodyStatsRepository struct {
	db *sql.DB
}

func NewBodyStatsRepository(db *sql.DB) *BodyStatsRepository {
	return &BodyStatsRepository{db: db}
}

func (r *BodyStatsRepository) Create(ctx context.Context, bs *models.MemberBodyStats) (int64, error) {
	const query = `
		INSERT INTO member_body_stats (mbs_weight, mbs_height, mbs_activity_level, mbs_target, mb_id)
		VALUES (?, ?, ?, ?, ?)`

	res, err := r.db.ExecContext(ctx, query, bs.MbsWeight, bs.MbsHeight, bs.MbsActivityLevel, bs.MbsTarget, bs.MbID)
	if err != nil {
		return 0, fmt.Errorf("insert member_body_stats: %w", err)
	}
	return res.LastInsertId()
}

// CreateWithBmr inserts a new member_body_stats row and its computed
// member_bmr_history row in a single transaction (SOYDEE_AI_TASK.md §5
// หน้า3) — mirrors MemberRepository.CreateWithBodyStats so a profile-edit
// save never leaves BMR history stale behind a separate, best-effort call.
func (r *BodyStatsRepository) CreateWithBmr(ctx context.Context, bs *models.MemberBodyStats, gender int, birthDate time.Time) (int64, *models.MemberBmrHistory, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	const insertBodyStats = `
		INSERT INTO member_body_stats (mbs_weight, mbs_height, mbs_activity_level, mbs_target, mb_id)
		VALUES (?, ?, ?, ?, ?)`

	res, err := tx.ExecContext(ctx, insertBodyStats, bs.MbsWeight, bs.MbsHeight, bs.MbsActivityLevel, bs.MbsTarget, bs.MbID)
	if err != nil {
		return 0, nil, fmt.Errorf("insert member_body_stats: %w", err)
	}

	mbsID, err := res.LastInsertId()
	if err != nil {
		return 0, nil, fmt.Errorf("get body stats insert id: %w", err)
	}

	recordDate := utils.Today()
	result := utils.ComputeBMR(gender, birthDate, recordDate, *bs.MbsWeight, *bs.MbsHeight, *bs.MbsActivityLevel, *bs.MbsTarget)

	const insertBmr = `
		INSERT INTO member_bmr_history (mbh_record_date, mbh_bmi, mbh_eval_result, mbh_bmr, mbh_tdee, mbh_tdee_target, mb_id, mbs_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	bmrRes, err := tx.ExecContext(ctx, insertBmr,
		recordDate, result.BMI, result.EvalResult, result.BMR, result.TDEE, result.TDEETarget, bs.MbID, mbsID)
	if err != nil {
		return 0, nil, fmt.Errorf("insert member_bmr_history: %w", err)
	}

	mbhID, err := bmrRes.LastInsertId()
	if err != nil {
		return 0, nil, fmt.Errorf("get bmr insert id: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, nil, fmt.Errorf("commit tx: %w", err)
	}

	history := &models.MemberBmrHistory{
		MbhID:         int(mbhID),
		MbhRecordDate: recordDate,
		MbhBMI:        &result.BMI,
		MbhEvalResult: &result.EvalResult,
		MbhBMR:        &result.BMR,
		MbhTDEE:       &result.TDEE,
		MbhTDEETarget: &result.TDEETarget,
		MbID:          bs.MbID,
		MbsID:         int(mbsID),
	}
	return mbsID, history, nil
}

func (r *BodyStatsRepository) ListByMember(ctx context.Context, mbID int) ([]models.MemberBodyStats, error) {
	const query = `
		SELECT mbs_id, mbs_weight, mbs_height, mbs_activity_level, mbs_target, mbs_recorded_date, mb_id
		FROM member_body_stats
		WHERE mb_id = ?
		ORDER BY mbs_recorded_date DESC`

	rows, err := r.db.QueryContext(ctx, query, mbID)
	if err != nil {
		return nil, fmt.Errorf("list member_body_stats: %w", err)
	}
	defer rows.Close()

	items := []models.MemberBodyStats{}
	for rows.Next() {
		var bs models.MemberBodyStats
		if err := rows.Scan(&bs.MbsID, &bs.MbsWeight, &bs.MbsHeight, &bs.MbsActivityLevel, &bs.MbsTarget, &bs.MbsRecordedDate, &bs.MbID); err != nil {
			return nil, fmt.Errorf("scan member_body_stats: %w", err)
		}
		items = append(items, bs)
	}
	return items, rows.Err()
}

func (r *BodyStatsRepository) LatestByMember(ctx context.Context, mbID int) (*models.MemberBodyStats, error) {
	const query = `
		SELECT mbs_id, mbs_weight, mbs_height, mbs_activity_level, mbs_target, mbs_recorded_date, mb_id
		FROM member_body_stats
		WHERE mb_id = ?
		ORDER BY mbs_recorded_date DESC
		LIMIT 1`

	return r.scanOne(r.db.QueryRowContext(ctx, query, mbID))
}

func (r *BodyStatsRepository) FindByID(ctx context.Context, id int) (*models.MemberBodyStats, error) {
	const query = `
		SELECT mbs_id, mbs_weight, mbs_height, mbs_activity_level, mbs_target, mbs_recorded_date, mb_id
		FROM member_body_stats
		WHERE mbs_id = ?`

	return r.scanOne(r.db.QueryRowContext(ctx, query, id))
}

func (r *BodyStatsRepository) scanOne(row *sql.Row) (*models.MemberBodyStats, error) {
	var bs models.MemberBodyStats
	err := row.Scan(&bs.MbsID, &bs.MbsWeight, &bs.MbsHeight, &bs.MbsActivityLevel, &bs.MbsTarget, &bs.MbsRecordedDate, &bs.MbID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan member_body_stats: %w", err)
	}
	return &bs, nil
}
