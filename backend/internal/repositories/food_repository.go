package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"soydee-api/internal/models"
)

// ErrInUse means the row can't be deleted because other rows reference it.
var ErrInUse = errors.New("record is referenced by other data")

type FoodRepository struct {
	db *sql.DB
}

func NewFoodRepository(db *sql.DB) *FoodRepository {
	return &FoodRepository{db: db}
}

// FoodCategoryWithUsage adds how many daily_food_record rows currently
// reference each category — the admin food-category list shows this so an
// admin can see the blast radius before clicking delete (SOYDEE_AI_TASK.md
// §5 หน้า8), instead of finding out only after a 409 comes back.
type FoodCategoryWithUsage struct {
	models.FoodCategory
	UsageCount int `json:"usage_count"`
}

func (r *FoodRepository) List(ctx context.Context, trafficLight *int) ([]FoodCategoryWithUsage, error) {
	query := `
		SELECT fc.fd_id, fc.fd_name, fc.fd_traffic_light, fc.fd_images,
		       (SELECT COUNT(*) FROM daily_food_record d WHERE d.fd_id = fc.fd_id) AS usage_count
		FROM food_category fc`
	args := []interface{}{}
	if trafficLight != nil {
		query += ` WHERE fc.fd_traffic_light = ?`
		args = append(args, *trafficLight)
	}
	query += ` ORDER BY fc.fd_id`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list food_category: %w", err)
	}
	defer rows.Close()

	items := []FoodCategoryWithUsage{}
	for rows.Next() {
		var f FoodCategoryWithUsage
		if err := rows.Scan(&f.FdID, &f.FdName, &f.FdTrafficLight, &f.FdImages, &f.UsageCount); err != nil {
			return nil, fmt.Errorf("scan food_category: %w", err)
		}
		items = append(items, f)
	}
	return items, rows.Err()
}

func (r *FoodRepository) FindByID(ctx context.Context, id int) (*models.FoodCategory, error) {
	const query = `SELECT fd_id, fd_name, fd_traffic_light, fd_images FROM food_category WHERE fd_id = ?`

	var f models.FoodCategory
	err := r.db.QueryRowContext(ctx, query, id).Scan(&f.FdID, &f.FdName, &f.FdTrafficLight, &f.FdImages)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan food_category: %w", err)
	}
	return &f, nil
}

func (r *FoodRepository) Create(ctx context.Context, f *models.FoodCategory) (int64, error) {
	const query = `INSERT INTO food_category (fd_name, fd_traffic_light, fd_images) VALUES (?, ?, ?)`

	res, err := r.db.ExecContext(ctx, query, f.FdName, f.FdTrafficLight, f.FdImages)
	if err != nil {
		return 0, fmt.Errorf("insert food_category: %w", err)
	}
	return res.LastInsertId()
}

func (r *FoodRepository) Update(ctx context.Context, f *models.FoodCategory) error {
	const query = `UPDATE food_category SET fd_name = ?, fd_traffic_light = ?, fd_images = ? WHERE fd_id = ?`

	res, err := r.db.ExecContext(ctx, query, f.FdName, f.FdTrafficLight, f.FdImages, f.FdID)
	if err != nil {
		return fmt.Errorf("update food_category: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *FoodRepository) Delete(ctx context.Context, id int) error {
	var inUse int
	err := r.db.QueryRowContext(ctx, `SELECT 1 FROM daily_food_record WHERE fd_id = ? LIMIT 1`, id).Scan(&inUse)
	if err == nil {
		return ErrInUse
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("check food_category usage: %w", err)
	}

	res, err := r.db.ExecContext(ctx, `DELETE FROM food_category WHERE fd_id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete food_category: %w", err)
	}
	return checkRowsAffected(res)
}

// NameExists reports whether another category (id != excludeID) already uses
// name. The column collation is case-insensitive, so "Salad" == "salad".
func (r *FoodRepository) NameExists(ctx context.Context, name string, excludeID int) (bool, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM food_category WHERE fd_name = ? AND fd_id <> ?`, name, excludeID).Scan(&n)
	if err != nil {
		return false, fmt.Errorf("check food_category name: %w", err)
	}
	return n > 0, nil
}
