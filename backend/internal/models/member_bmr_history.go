package models

import "time"

// MemberBmrHistory maps to the member_bmr_history table.
type MemberBmrHistory struct {
	MbhID         int       `json:"mbh_id" db:"mbh_id"`
	MbhRecordDate time.Time `json:"mbh_record_date" db:"mbh_record_date"`
	MbhBMI        *float64  `json:"mbh_bmi" db:"mbh_bmi"`
	MbhEvalResult *int      `json:"mbh_eval_result" db:"mbh_eval_result"`
	MbhBMR        *float64  `json:"mbh_bmr" db:"mbh_bmr"`
	MbhTDEE       *float64  `json:"mbh_tdee" db:"mbh_tdee"`
	MbhTDEETarget *float64  `json:"mbh_tdee_target" db:"mbh_tdee_target"`
	MbID          int       `json:"mb_id" db:"mb_id"`
	MbsID         int       `json:"mbs_id" db:"mbs_id"`
}

// BMI evaluation enum values per API_SPEC.md §6.1.
const (
	BMIEvalUnderweight = 1
	BMIEvalNormal      = 2
	BMIEvalOverweight  = 3
	BMIEvalObese       = 4
)
