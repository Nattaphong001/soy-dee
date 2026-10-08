package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"soydee-api/internal/models"
)

type SleepRepository struct {
	db *sql.DB
}

func NewSleepRepository(db *sql.DB) *SleepRepository {
	return &SleepRepository{db: db}
}

const sleepRecordColumns = `dslp_id, dslp_date, dslp_start_time, dslp_end_time, dslp_total_hours, dslp_eval_result, dslp_quality_score, dslp_created_at, mb_id`

func (r *SleepRepository) ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailySleepRecord, error) {
	query := `SELECT ` + sleepRecordColumns + ` FROM daily_sleep_record WHERE mb_id = ? AND dslp_date = ? ORDER BY dslp_id`

	rows, err := r.db.QueryContext(ctx, query, mbID, date)
	if err != nil {
		return nil, fmt.Errorf("list daily_sleep_record: %w", err)
	}
	defer rows.Close()

	items := []models.DailySleepRecord{}
	for rows.Next() {
		var s models.DailySleepRecord
		if err := rows.Scan(&s.DslpID, &s.DslpDate, &s.DslpStartTime, &s.DslpEndTime, &s.DslpTotalHours, &s.DslpEvalResult, &s.DslpQualityScore, &s.DslpCreatedAt, &s.MbID); err != nil {
			return nil, fmt.Errorf("scan daily_sleep_record: %w", err)
		}
		items = append(items, s)
	}
	return items, rows.Err()
}

func (r *SleepRepository) FindByID(ctx context.Context, id int) (*models.DailySleepRecord, error) {
	query := `SELECT ` + sleepRecordColumns + ` FROM daily_sleep_record WHERE dslp_id = ?`

	var s models.DailySleepRecord
	err := r.db.QueryRowContext(ctx, query, id).Scan(&s.DslpID, &s.DslpDate, &s.DslpStartTime, &s.DslpEndTime, &s.DslpTotalHours, &s.DslpEvalResult, &s.DslpQualityScore, &s.DslpCreatedAt, &s.MbID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan daily_sleep_record: %w", err)
	}
	return &s, nil
}

func (r *SleepRepository) Create(ctx context.Context, s *models.DailySleepRecord) (int64, error) {
	const query = `
		INSERT INTO daily_sleep_record (dslp_date, dslp_start_time, dslp_end_time, dslp_total_hours, dslp_eval_result, dslp_quality_score, mb_id)
		VALUES (?, ?, ?, ?, ?, ?, ?)`

	res, err := r.db.ExecContext(ctx, query, s.DslpDate, s.DslpStartTime, s.DslpEndTime, s.DslpTotalHours, s.DslpEvalResult, s.DslpQualityScore, s.MbID)
	if err != nil {
		return 0, fmt.Errorf("insert daily_sleep_record: %w", err)
	}
	return res.LastInsertId()
}

func (r *SleepRepository) Update(ctx context.Context, s *models.DailySleepRecord) error {
	const query = `
		UPDATE daily_sleep_record
		SET dslp_date = ?, dslp_start_time = ?, dslp_end_time = ?, dslp_total_hours = ?, dslp_eval_result = ?, dslp_quality_score = ?
		WHERE dslp_id = ? AND mb_id = ?`

	res, err := r.db.ExecContext(ctx, query, s.DslpDate, s.DslpStartTime, s.DslpEndTime, s.DslpTotalHours, s.DslpEvalResult, s.DslpQualityScore, s.DslpID, s.MbID)
	if err != nil {
		return fmt.Errorf("update daily_sleep_record: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *SleepRepository) Delete(ctx context.Context, id, mbID int) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM daily_sleep_record WHERE dslp_id = ? AND mb_id = ?`, id, mbID)
	if err != nil {
		return fmt.Errorf("delete daily_sleep_record: %w", err)
	}
	return checkRowsAffected(res)
}
