package dto

import "soydee-api/pkg/utils"

// BmrCalculateRequest is the POST /members/{id}/bmr/calculate body
// (API_SPEC.md §6.1). MbsID is optional — omitted means "use the member's
// latest body stats row".
type BmrCalculateRequest struct {
	MbsID         *int   `json:"mbs_id"`
	MbhRecordDate string `json:"mbh_record_date"`
}

func (r BmrCalculateRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("mbh_record_date", r.MbhRecordDate)
	if r.MbhRecordDate != "" {
		if _, err := utils.ParseDate(r.MbhRecordDate); err != nil {
			v.Check(false, "mbh_record_date must be in YYYY-MM-DD format")
		}
	}
	return v
}

// BodyStatsRequest is the POST /members/{id}/body-stats body
// (API_SPEC.md §6.4).
type BodyStatsRequest struct {
	MbsWeight        *float64 `json:"mbs_weight"`
	MbsHeight        *float64 `json:"mbs_height"`
	MbsActivityLevel *float64 `json:"mbs_activity_level"`
	MbsTarget        *int     `json:"mbs_target"`
}

func (r BodyStatsRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Check(r.MbsWeight != nil, "mbs_weight is required")
	if r.MbsWeight != nil {
		v.Check(*r.MbsWeight > 0 && *r.MbsWeight < 400, "mbs_weight must be between 0 and 400")
	}
	v.Check(r.MbsHeight != nil, "mbs_height is required")
	if r.MbsHeight != nil {
		v.Check(*r.MbsHeight > 50 && *r.MbsHeight < 300, "mbs_height must be between 50 and 300")
	}
	// Required so the save can always compute member_bmr_history in the
	// same transaction (SOYDEE_AI_TASK.md §5 หน้า3).
	v.Check(r.MbsActivityLevel != nil, "mbs_activity_level is required")
	v.Check(r.MbsTarget != nil, "mbs_target is required")
	if r.MbsTarget != nil {
		v.OneOf("mbs_target", *r.MbsTarget, 1, 2, 3)
	}
	return v
}
