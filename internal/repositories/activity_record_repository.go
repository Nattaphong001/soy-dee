package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"soydee-api/internal/models"
)

// ActivityRecordRepository handles daily_activity_record — kept separate
// from ActivityRepository (activity_master master data).
type ActivityRecordRepository struct {
	db *sql.DB
}

func NewActivityRecordRepository(db *sql.DB) *ActivityRecordRepository {
	return &ActivityRecordRepository{db: db}
}

const activityRecordColumns = `dact_id, dact_date, dact_duration_min, dact_distance_km, dact_detail, dact_created_at, mb_id, act_id`

func (r *ActivityRecordRepository) ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailyActivityRecord, error) {
	query := `SELECT ` + activityRecordColumns + ` FROM daily_activity_record WHERE mb_id = ? AND dact_date = ? ORDER BY dact_id`

	rows, err := r.db.QueryContext(ctx, query, mbID, date)
	if err != nil {
		return nil, fmt.Errorf("list daily_activity_record: %w", err)
	}
	defer rows.Close()

	items := []models.DailyActivityRecord{}
	for rows.Next() {
		var a models.DailyActivityRecord
		if err := rows.Scan(&a.DactID, &a.DactDate, &a.DactDurationMin, &a.DactDistanceKm, &a.DactDetail, &a.DactCreatedAt, &a.MbID, &a.ActID); err != nil {
			return nil, fmt.Errorf("scan daily_activity_record: %w", err)
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

func (r *ActivityRecordRepository) FindByID(ctx context.Context, id int) (*models.DailyActivityRecord, error) {
	query := `SELECT ` + activityRecordColumns + ` FROM daily_activity_record WHERE dact_id = ?`

	var a models.DailyActivityRecord
	err := r.db.QueryRowContext(ctx, query, id).Scan(&a.DactID, &a.DactDate, &a.DactDurationMin, &a.DactDistanceKm, &a.DactDetail, &a.DactCreatedAt, &a.MbID, &a.ActID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan daily_activity_record: %w", err)
	}
	return &a, nil
}

func (r *ActivityRecordRepository) Create(ctx context.Context, a *models.DailyActivityRecord) (int64, error) {
	const query = `INSERT INTO daily_activity_record (dact_date, dact_duration_min, dact_distance_km, dact_detail, mb_id, act_id) VALUES (?, ?, ?, ?, ?, ?)`

	res, err := r.db.ExecContext(ctx, query, a.DactDate, a.DactDurationMin, a.DactDistanceKm, a.DactDetail, a.MbID, a.ActID)
	if err != nil {
		return 0, fmt.Errorf("insert daily_activity_record: %w", err)
	}
	return res.LastInsertId()
}

func (r *ActivityRecordRepository) Update(ctx context.Context, a *models.DailyActivityRecord) error {
	const query = `UPDATE daily_activity_record SET dact_date = ?, dact_duration_min = ?, dact_distance_km = ?, dact_detail = ?, act_id = ? WHERE dact_id = ? AND mb_id = ?`

	res, err := r.db.ExecContext(ctx, query, a.DactDate, a.DactDurationMin, a.DactDistanceKm, a.DactDetail, a.ActID, a.DactID, a.MbID)
	if err != nil {
		return fmt.Errorf("update daily_activity_record: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *ActivityRecordRepository) Delete(ctx context.Context, id, mbID int) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM daily_activity_record WHERE dact_id = ? AND mb_id = ?`, id, mbID)
	if err != nil {
		return fmt.Errorf("delete daily_activity_record: %w", err)
	}
	return checkRowsAffected(res)
}
