package models

import "time"

// DailySleepRecord maps to the daily_sleep_record table.
// NOTE: dslp_eval_result is VARCHAR(20) in Datasic.sql even though
// API_SPEC.md's example response shows it as a number (1/2/3) — the model
// keeps the raw string (DB truth) and the response DTO converts it to int.
type DailySleepRecord struct {
	DslpID           int       `json:"dslp_id" db:"dslp_id"`
	DslpDate         time.Time `json:"dslp_date" db:"dslp_date"`
	DslpStartTime    time.Time `json:"dslp_start_time" db:"dslp_start_time"`
	DslpEndTime      time.Time `json:"dslp_end_time" db:"dslp_end_time"`
	DslpTotalHours   *float64  `json:"dslp_total_hours" db:"dslp_total_hours"`
	DslpEvalResult   *string   `json:"dslp_eval_result" db:"dslp_eval_result"`
	DslpQualityScore *int      `json:"dslp_quality_score" db:"dslp_quality_score"`
	DslpCreatedAt    time.Time `json:"dslp_created_at" db:"dslp_created_at"`
	MbID             int       `json:"mb_id" db:"mb_id"`
}

// Sleep evaluation enum values per API_SPEC.md §9.
const (
	SleepEvalTooLittle = 1
	SleepEvalJustRight = 2
	SleepEvalTooMuch   = 3
)

// Sleep quality enum values per API_SPEC.md §9.
const (
	SleepQualityPoor   = 1
	SleepQualityMedium = 2
	SleepQualityGood   = 3
)
