package models

import "time"

// MemberBodyStats maps to the member_body_stats table.
type MemberBodyStats struct {
	MbsID            int       `json:"mbs_id" db:"mbs_id"`
	MbsWeight        *float64  `json:"mbs_weight" db:"mbs_weight"`
	MbsHeight        *float64  `json:"mbs_height" db:"mbs_height"`
	MbsActivityLevel *float64  `json:"mbs_activity_level" db:"mbs_activity_level"`
	MbsTarget        *int      `json:"mbs_target" db:"mbs_target"`
	MbsRecordedDate  time.Time `json:"mbs_recorded_date" db:"mbs_recorded_date"`
	MbID             int       `json:"mb_id" db:"mb_id"`
}

// Target enum values per API_SPEC.md §4.1.
const (
	TargetLoseWeight = 1
	TargetGainMuscle = 2
	TargetMaintain   = 3
)
