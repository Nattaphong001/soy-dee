package models

import "time"

// DailyActivityRecord maps to the daily_activity_record table.
// dact_duration_min is an INT column storing plain minutes (verified against
// the live schema — API_SPEC.md previously assumed TIME/"HH:mm:ss", which was
// wrong and silently truncated every duration to 0 via implicit string->int
// coercion; corrected here and in API_SPEC.md §8/§13).
type DailyActivityRecord struct {
	DactID          int       `json:"dact_id" db:"dact_id"`
	DactDate        time.Time `json:"dact_date" db:"dact_date"`
	DactDurationMin *int      `json:"dact_duration_min" db:"dact_duration_min"`
	DactDistanceKm  *float64  `json:"dact_distance_km" db:"dact_distance_km"`
	DactDetail      *string   `json:"dact_detail" db:"dact_detail"`
	DactCreatedAt   time.Time `json:"dact_created_at" db:"dact_created_at"`
	MbID            int       `json:"mb_id" db:"mb_id"`
	ActID           int       `json:"act_id" db:"act_id"`
}
