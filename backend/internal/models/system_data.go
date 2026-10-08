package models

import "time"

// SystemData maps to the system_data table (admin accounts).
type SystemData struct {
	SysID        int       `json:"sys_id" db:"sys_id"`
	SysUsername  string    `json:"sys_username" db:"sys_username"`
	SysFullName  *string   `json:"sys_full_name" db:"sys_full_name"`
	SysAvatarPic *string   `json:"sys_avatar_pic" db:"sys_avatar_pic"`
	SysPassword  string    `json:"-" db:"sys_password"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}
