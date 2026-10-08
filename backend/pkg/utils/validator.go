package utils

import (
	"fmt"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// Validator accumulates field validation errors so handlers can report
// every problem at once instead of failing on the first check.
type Validator struct {
	errors []string
}

func NewValidator() *Validator {
	return &Validator{}
}

func (v *Validator) Check(ok bool, message string) {
	if !ok {
		v.errors = append(v.errors, message)
	}
}

func (v *Validator) Required(field, value string) {
	v.Check(strings.TrimSpace(value) != "", fmt.Sprintf("%s is required", field))
}

// MinLen/MaxLen count runes, not bytes — len(value) on a Go string is UTF-8
// byte length, which would enforce "100 characters" as ~33 characters for
// Thai text (3 bytes/rune), silently rejecting names well under the stated
// limit (SOYDEE_AI_TASK.md's whole system is Thai-first: fd_name, act_name,
// mb_full_name, dfd_food_name all go through this).
func (v *Validator) MinLen(field, value string, min int) {
	v.Check(utf8.RuneCountInString(value) >= min, fmt.Sprintf("%s must be at least %d characters", field, min))
}

func (v *Validator) MaxLen(field, value string, max int) {
	v.Check(utf8.RuneCountInString(value) <= max, fmt.Sprintf("%s must be at most %d characters", field, max))
}

// PasswordComplexity requires at least one letter and one digit, on top of
// whatever MinLen check the caller already applied.
func (v *Validator) PasswordComplexity(field, value string) {
	var hasLetter, hasDigit bool
	for _, r := range value {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	v.Check(hasLetter && hasDigit, fmt.Sprintf("%s must contain at least one letter and one digit", field))
}

func (v *Validator) OneOf(field string, value int, allowed ...int) {
	for _, a := range allowed {
		if value == a {
			return
		}
	}
	v.Check(false, fmt.Sprintf("%s must be one of %v", field, allowed))
}

func (v *Validator) Valid() bool {
	return len(v.errors) == 0
}

func (v *Validator) Errors() []string {
	return v.errors
}

func (v *Validator) Message() string {
	return strings.Join(v.errors, "; ")
}

// ParseDate parses a YYYY-MM-DD date string per API_SPEC.md §1.
//
// Parsed in time.Local (not UTC): the mysql driver DSN uses loc=Local, so a
// UTC-midnight value gets shifted forward when the driver converts it to
// Local for the query arg (e.g. 00:00 UTC -> 07:00 +07 in Thailand). That
// leaves a non-zero time-of-day, which no longer equals a DATE column's
// implicit 00:00:00 in comparisons like "dfd_date = ?" — parsing directly in
// Local keeps the value at local midnight so equality comparisons work.
func ParseDate(value string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", value, time.Local)
}

// Today returns local midnight for the current day — the default "date"
// filter for the daily record endpoints. Using time.Now() directly here
// would carry a non-zero time-of-day, which fails equality comparisons
// against a DATE column the same way an un-truncated ParseDate value would.
func Today() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
}

// ParseTimeOfDay parses an HH:mm:ss string per API_SPEC.md §1.
func ParseTimeOfDay(value string) (time.Time, error) {
	return time.Parse("15:04:05", value)
}
