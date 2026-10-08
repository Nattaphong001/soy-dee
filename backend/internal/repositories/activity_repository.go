package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"soydee-api/internal/models"
)

type ActivityRepository struct {
	db *sql.DB
}

func NewActivityRepository(db *sql.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

// ActivityWithUsage adds how many daily_activity_record rows currently
// reference each activity — the admin list shows this so an admin can see
// the blast radius before clicking delete (SOYDEE_AI_TASK.md §5 หน้า8),
// which matters more here than for food categories since act_id is
// ON DELETE RESTRICT: a nonzero count means delete will be rejected outright.
type ActivityWithUsage struct {
	models.ActivityMaster
	UsageCount int `json:"usage_count"`
}

func (r *ActivityRepository) List(ctx context.Context) ([]ActivityWithUsage, error) {
	const query = `
		SELECT a.act_id, a.act_name, a.act_images, a.act_category, a.act_has_distance, a.act_intensity,
		       (SELECT COUNT(*) FROM daily_activity_record d WHERE d.act_id = a.act_id) AS usage_count
		FROM activity_master a ORDER BY a.act_id`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list activity_master: %w", err)
	}
	defer rows.Close()

	items := []ActivityWithUsage{}
	for rows.Next() {
		var a ActivityWithUsage
		if err := rows.Scan(&a.ActID, &a.ActName, &a.ActImages, &a.ActCategory, &a.ActHasDistance, &a.ActIntensity, &a.UsageCount); err != nil {
			return nil, fmt.Errorf("scan activity_master: %w", err)
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

func (r *ActivityRepository) FindByID(ctx context.Context, id int) (*models.ActivityMaster, error) {
	const query = `SELECT act_id, act_name, act_images, act_category, act_has_distance, act_intensity FROM activity_master WHERE act_id = ?`

	var a models.ActivityMaster
	err := r.db.QueryRowContext(ctx, query, id).Scan(&a.ActID, &a.ActName, &a.ActImages, &a.ActCategory, &a.ActHasDistance, &a.ActIntensity)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan activity_master: %w", err)
	}
	return &a, nil
}

func (r *ActivityRepository) Create(ctx context.Context, a *models.ActivityMaster) (int64, error) {
	const query = `INSERT INTO activity_master (act_name, act_images, act_category, act_has_distance, act_intensity) VALUES (?, ?, ?, ?, ?)`

	res, err := r.db.ExecContext(ctx, query, a.ActName, a.ActImages, a.ActCategory, a.ActHasDistance, a.ActIntensity)
	if err != nil {
		return 0, fmt.Errorf("insert activity_master: %w", err)
	}
	return res.LastInsertId()
}

func (r *ActivityRepository) Update(ctx context.Context, a *models.ActivityMaster) error {
	const query = `UPDATE activity_master SET act_name = ?, act_images = ?, act_category = ?, act_has_distance = ?, act_intensity = ? WHERE act_id = ?`

	res, err := r.db.ExecContext(ctx, query, a.ActName, a.ActImages, a.ActCategory, a.ActHasDistance, a.ActIntensity, a.ActID)
	if err != nil {
		return fmt.Errorf("update activity_master: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *ActivityRepository) Delete(ctx context.Context, id int) error {
	var inUse int
	err := r.db.QueryRowContext(ctx, `SELECT 1 FROM daily_activity_record WHERE act_id = ? LIMIT 1`, id).Scan(&inUse)
	if err == nil {
		return ErrInUse
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("check activity_master usage: %w", err)
	}

	res, err := r.db.ExecContext(ctx, `DELETE FROM activity_master WHERE act_id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete activity_master: %w", err)
	}
	return checkRowsAffected(res)
}

// NameExists reports whether another activity (id != excludeID) already uses name.
func (r *ActivityRepository) NameExists(ctx context.Context, name string, excludeID int) (bool, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM activity_master WHERE act_name = ? AND act_id <> ?`, name, excludeID).Scan(&n)
	if err != nil {
		return false, fmt.Errorf("check activity_master name: %w", err)
	}
	return n > 0, nil
}
