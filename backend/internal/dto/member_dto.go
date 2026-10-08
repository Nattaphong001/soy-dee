package dto

import "soydee-api/pkg/utils"

// RegisterBodyStats is the nested body_stats object in RegisterRequest
// (API_SPEC.md §4.1).
type RegisterBodyStats struct {
	MbsWeight        *float64 `json:"mbs_weight"`
	MbsHeight        *float64 `json:"mbs_height"`
	MbsActivityLevel *float64 `json:"mbs_activity_level"`
	MbsTarget        *int     `json:"mbs_target"`
}

type RegisterRequest struct {
	MbUserName  string            `json:"mb_user_name"`
	MbPassword  string            `json:"mb_password"`
	MbFullName  string            `json:"mb_full_name"`
	MbGender    *int              `json:"mb_gender"`
	MbBirthDate string            `json:"mb_birth_date"`
	BodyStats   RegisterBodyStats `json:"body_stats"`
}

func (r RegisterRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("mb_user_name", r.MbUserName)
	v.MinLen("mb_user_name", r.MbUserName, 4)
	v.MaxLen("mb_user_name", r.MbUserName, 100)
	v.Required("mb_password", r.MbPassword)
	v.MinLen("mb_password", r.MbPassword, 8)
	v.PasswordComplexity("mb_password", r.MbPassword)
	v.Required("mb_full_name", r.MbFullName)
	v.MaxLen("mb_full_name", r.MbFullName, 100)

	v.Check(r.MbGender != nil, "mb_gender is required")
	if r.MbGender != nil {
		v.OneOf("mb_gender", *r.MbGender, 1, 2)
	}
	v.Check(r.MbBirthDate != "", "mb_birth_date is required")
	if r.MbBirthDate != "" {
		if _, err := utils.ParseDate(r.MbBirthDate); err != nil {
			v.Check(false, "mb_birth_date must be in YYYY-MM-DD format")
		}
	}

	// Required so CreateWithBodyStats can always compute the
	// member_bmr_history row in the same transaction (SOYDEE_AI_TASK.md §5
	// หน้า1) — ranges mirror the chk_mbs_weight/chk_mbs_height DB constraints.
	v.Check(r.BodyStats.MbsWeight != nil, "body_stats.mbs_weight is required")
	if r.BodyStats.MbsWeight != nil {
		v.Check(*r.BodyStats.MbsWeight > 0 && *r.BodyStats.MbsWeight < 400, "body_stats.mbs_weight must be between 0 and 400")
	}
	v.Check(r.BodyStats.MbsHeight != nil, "body_stats.mbs_height is required")
	if r.BodyStats.MbsHeight != nil {
		v.Check(*r.BodyStats.MbsHeight > 50 && *r.BodyStats.MbsHeight < 300, "body_stats.mbs_height must be between 50 and 300")
	}
	v.Check(r.BodyStats.MbsActivityLevel != nil, "body_stats.mbs_activity_level is required")
	v.Check(r.BodyStats.MbsTarget != nil, "body_stats.mbs_target is required")
	if r.BodyStats.MbsTarget != nil {
		v.OneOf("body_stats.mbs_target", *r.BodyStats.MbsTarget, 1, 2, 3)
	}

	return v
}

// ProfileUpdateRequest is the PUT /members/{id}/profile body
// (API_SPEC.md §4.3).
type ProfileUpdateRequest struct {
	MbFullName   string  `json:"mb_full_name"`
	MbUserName   string  `json:"mb_user_name"`
	MbGender     *int    `json:"mb_gender"`
	MbBirthDate  string  `json:"mb_birth_date"`
	MbProfilePic *string `json:"mb_profile_pic"`
}

func (r ProfileUpdateRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("mb_full_name", r.MbFullName)
	v.MaxLen("mb_full_name", r.MbFullName, 100)
	v.Required("mb_user_name", r.MbUserName)
	v.MinLen("mb_user_name", r.MbUserName, 4)
	v.MaxLen("mb_user_name", r.MbUserName, 100)
	if r.MbGender != nil {
		v.OneOf("mb_gender", *r.MbGender, 1, 2)
	}
	if r.MbBirthDate != "" {
		if _, err := utils.ParseDate(r.MbBirthDate); err != nil {
			v.Check(false, "mb_birth_date must be in YYYY-MM-DD format")
		}
	}
	return v
}

// PasswordChangeRequest is the PATCH /members/{id}/password body
// (API_SPEC.md §4.4).
type PasswordChangeRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

func (r PasswordChangeRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("current_password", r.CurrentPassword)
	v.Required("new_password", r.NewPassword)
	v.MinLen("new_password", r.NewPassword, 8)
	v.PasswordComplexity("new_password", r.NewPassword)
	v.Check(r.NewPassword == r.ConfirmPassword, "new_password and confirm_password must match")
	return v
}
