package models

import "time"

// DailyFoodRecord maps to the daily_food_record table.
// dfd_time is stored as a "HH:mm:ss" string because MySQL TIME columns are
// not reliably scanned into time.Time by the driver.
type DailyFoodRecord struct {
	DfdID        int       `json:"dfd_id" db:"dfd_id"`
	DfdDate      time.Time `json:"dfd_date" db:"dfd_date"`
	DfdTime      string    `json:"dfd_time" db:"dfd_time"`
	DfdMealType  *int      `json:"dfd_meal_type" db:"dfd_meal_type"`
	DfdFoodName  *string   `json:"dfd_food_name" db:"dfd_food_name"`
	DfdAmount    *string   `json:"dfd_amount" db:"dfd_amount"`
	DfdImage     *string   `json:"dfd_image" db:"dfd_image"`
	DfdCreatedAt time.Time `json:"dfd_created_at" db:"dfd_created_at"`
	DfdUpdatedAt time.Time `json:"dfd_updated_at" db:"dfd_updated_at"`
	MbID         int       `json:"mb_id" db:"mb_id"`
	FdID         *int      `json:"fd_id" db:"fd_id"`
}

// Meal type enum values per API_SPEC.md §7.
const (
	MealTypeBreakfast = 1
	MealTypeLunch     = 2
	MealTypeDinner    = 3
	MealTypeSnack     = 4
)
