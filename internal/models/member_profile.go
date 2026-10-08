package models

import "time"

// MemberProfile maps to the member_profile table.
type MemberProfile struct {
	MbID           int        `json:"mb_id" db:"mb_id"`
	MbUserName     string     `json:"mb_user_name" db:"mb_user_name"`
	MbPasswordHash string     `json:"-" db:"mb_password_hash"`
	MbGender       *int       `json:"mb_gender" db:"mb_gender"`
	MbFullName     string     `json:"mb_full_name" db:"mb_full_name"`
	MbBirthDate    *time.Time `json:"mb_birth_date" db:"mb_birth_date"`
	MbProfilePic   *string    `json:"mb_profile_pic" db:"mb_profile_pic"`
	MbCreatedAt    time.Time  `json:"mb_created_at" db:"mb_created_at"`
	MbUpdatedAt    time.Time  `json:"mb_updated_at" db:"mb_updated_at"`
}

// Gender enum values per API_SPEC.md §4.1.
const (
	GenderMale   = 1
	GenderFemale = 2
)
