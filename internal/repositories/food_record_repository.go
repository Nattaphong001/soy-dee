package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"soydee-api/internal/models"
)

// FoodRecordRepository handles daily_food_record — kept separate from
// FoodRepository (food_category master data) since they're different
// aggregates that happen to share a "food" prefix.
type FoodRecordRepository struct {
	db *sql.DB
}

func NewFoodRecordRepository(db *sql.DB) *FoodRecordRepository {
	return &FoodRecordRepository{db: db}
}

const foodRecordColumns = `dfd_id, dfd_date, dfd_time, dfd_meal_type, dfd_food_name, dfd_amount, dfd_image, dfd_created_at, dfd_updated_at, mb_id, fd_id`

func (r *FoodRecordRepository) ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailyFoodRecord, error) {
	query := `SELECT ` + foodRecordColumns + ` FROM daily_food_record WHERE mb_id = ? AND dfd_date = ? ORDER BY dfd_time`

	rows, err := r.db.QueryContext(ctx, query, mbID, date)
	if err != nil {
		return nil, fmt.Errorf("list daily_food_record: %w", err)
	}
	defer rows.Close()

	items := []models.DailyFoodRecord{}
	for rows.Next() {
		var f models.DailyFoodRecord
		if err := rows.Scan(&f.DfdID, &f.DfdDate, &f.DfdTime, &f.DfdMealType, &f.DfdFoodName, &f.DfdAmount, &f.DfdImage, &f.DfdCreatedAt, &f.DfdUpdatedAt, &f.MbID, &f.FdID); err != nil {
			return nil, fmt.Errorf("scan daily_food_record: %w", err)
		}
		items = append(items, f)
	}
	return items, rows.Err()
}

func (r *FoodRecordRepository) FindByID(ctx context.Context, id int) (*models.DailyFoodRecord, error) {
	query := `SELECT ` + foodRecordColumns + ` FROM daily_food_record WHERE dfd_id = ?`

	var f models.DailyFoodRecord
	err := r.db.QueryRowContext(ctx, query, id).Scan(&f.DfdID, &f.DfdDate, &f.DfdTime, &f.DfdMealType, &f.DfdFoodName, &f.DfdAmount, &f.DfdImage, &f.DfdCreatedAt, &f.DfdUpdatedAt, &f.MbID, &f.FdID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan daily_food_record: %w", err)
	}
	return &f, nil
}

func (r *FoodRecordRepository) Create(ctx context.Context, f *models.DailyFoodRecord) (int64, error) {
	const query = `
		INSERT INTO daily_food_record (dfd_date, dfd_time, dfd_meal_type, dfd_food_name, dfd_amount, dfd_image, mb_id, fd_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	res, err := r.db.ExecContext(ctx, query, f.DfdDate, f.DfdTime, f.DfdMealType, f.DfdFoodName, f.DfdAmount, f.DfdImage, f.MbID, f.FdID)
	if err != nil {
		return 0, fmt.Errorf("insert daily_food_record: %w", err)
	}
	return res.LastInsertId()
}

func (r *FoodRecordRepository) Update(ctx context.Context, f *models.DailyFoodRecord) error {
	const query = `
		UPDATE daily_food_record
		SET dfd_date = ?, dfd_time = ?, dfd_meal_type = ?, dfd_food_name = ?, dfd_amount = ?, dfd_image = ?, fd_id = ?
		WHERE dfd_id = ? AND mb_id = ?`

	res, err := r.db.ExecContext(ctx, query, f.DfdDate, f.DfdTime, f.DfdMealType, f.DfdFoodName, f.DfdAmount, f.DfdImage, f.FdID, f.DfdID, f.MbID)
	if err != nil {
		return fmt.Errorf("update daily_food_record: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *FoodRecordRepository) Delete(ctx context.Context, id, mbID int) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM daily_food_record WHERE dfd_id = ? AND mb_id = ?`, id, mbID)
	if err != nil {
		return fmt.Errorf("delete daily_food_record: %w", err)
	}
	return checkRowsAffected(res)
}
