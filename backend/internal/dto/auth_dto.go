package dto

import "soydee-api/pkg/utils"

type LoginMemberRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (r LoginMemberRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("username", r.Username)
	v.Required("password", r.Password)
	return v
}

type LoginAdminRequest struct {
	SysUsername string `json:"sys_username"`
	SysPassword string `json:"sys_password"`
}

func (r LoginAdminRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("sys_username", r.SysUsername)
	v.Required("sys_password", r.SysPassword)
	return v
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (r RefreshRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("refresh_token", r.RefreshToken)
	return v
}

type MemberSummary struct {
	MbID         int     `json:"mb_id"`
	MbUserName   string  `json:"mb_user_name"`
	MbFullName   string  `json:"mb_full_name"`
	MbGender     *int    `json:"mb_gender"`
	MbProfilePic *string `json:"mb_profile_pic"`
}

type AdminSummary struct {
	SysID       int    `json:"sys_id"`
	SysUsername string `json:"sys_username"`
}

// RefreshToken is an addition on top of API_SPEC.md §3.1's example payload:
// the spec documents POST /auth/refresh consuming a refresh_token but never
// shows where the client obtains one, so login also returns it here.
type MemberLoginResponse struct {
	Token        string        `json:"token"`
	RefreshToken string        `json:"refresh_token"`
	ExpiresIn    int64         `json:"expires_in"`
	Member       MemberSummary `json:"member"`
}

type AdminLoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"`
	Admin        AdminSummary `json:"admin"`
}

type RefreshResponse struct {
	Token     string `json:"token"`
	ExpiresIn int64  `json:"expires_in"`
}
