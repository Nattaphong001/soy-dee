package dto

import "soydee-api/pkg/utils"

// AdminProfileUpdateRequest is the PUT /admin/profile body. Mirrors
// ProfileUpdateRequest (member_dto.go) minus the fields admins don't have
// (gender, birth date — SOYDEE_AI_TASK.md ข้อ 5: no body-stats tab for admins).
type AdminProfileUpdateRequest struct {
	SysFullName string `json:"sys_full_name"`
	SysUsername string `json:"sys_username"`
}

func (r AdminProfileUpdateRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("sys_full_name", r.SysFullName)
	v.MaxLen("sys_full_name", r.SysFullName, 100)
	v.Required("sys_username", r.SysUsername)
	v.MinLen("sys_username", r.SysUsername, 4)
	v.MaxLen("sys_username", r.SysUsername, 100)
	return v
}
