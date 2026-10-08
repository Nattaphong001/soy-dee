package models

// FoodCategory maps to the food_category table.
type FoodCategory struct {
	FdID           int     `json:"fd_id" db:"fd_id"`
	FdName         string  `json:"fd_name" db:"fd_name"`
	FdTrafficLight *int    `json:"fd_traffic_light" db:"fd_traffic_light"`
	FdImages       *string `json:"fd_images" db:"fd_images"`
}

// Traffic light enum values per API_SPEC.md §5.1.
const (
	TrafficLightGreen  = 1
	TrafficLightYellow = 2
	TrafficLightRed    = 3
)
