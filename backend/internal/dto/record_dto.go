package dto

import (
	"strconv"
	"strings"
	"time"

	"soydee-api/internal/models"
	"soydee-api/pkg/utils"
)

// FoodRecordRequest is the POST/PUT body for /members/{id}/food-records
// (API_SPEC.md §7).
type FoodRecordRequest struct {
	DfdDate     string  `json:"dfd_date"`
	DfdTime     string  `json:"dfd_time"`
	DfdMealType *int    `json:"dfd_meal_type"`
	DfdFoodName *string `json:"dfd_food_name"`
	DfdAmount   *string `json:"dfd_amount"`
	DfdImage    *string `json:"dfd_image"`
	FdID        *int    `json:"fd_id"`
}

func (r FoodRecordRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("dfd_date", r.DfdDate)
	if r.DfdDate != "" {
		if d, err := utils.ParseDate(r.DfdDate); err != nil {
			v.Check(false, "dfd_date must be in YYYY-MM-DD format")
		} else {
			// SOYDEE_AI_TASK.md §5 หน้า4: ห้ามบันทึกวันที่ในอนาคต — the
			// datepicker widget blocks this client-side, but that's not a
			// substitute for a server-side check on direct API calls.
			v.Check(!d.After(utils.Today()), "dfd_date cannot be in the future")
		}
	}
	v.Required("dfd_time", r.DfdTime)
	if r.DfdTime != "" {
		if _, err := utils.ParseTimeOfDay(r.DfdTime); err != nil {
			v.Check(false, "dfd_time must be in HH:mm:ss format")
		}
	}
	v.Check(r.DfdMealType != nil, "dfd_meal_type is required")
	if r.DfdMealType != nil {
		v.OneOf("dfd_meal_type", *r.DfdMealType, 1, 2, 3, 4)
	}
	v.Check(r.FdID != nil, "fd_id is required")
	if r.DfdFoodName != nil {
		v.MaxLen("dfd_food_name", *r.DfdFoodName, 100)
	}
	if r.DfdAmount != nil {
		v.MaxLen("dfd_amount", *r.DfdAmount, 50)
	}
	// dfd_image must be a path returned by POST /members/{id}/food-images,
	// never an arbitrary URL.
	if r.DfdImage != nil && *r.DfdImage != "" {
		v.Check(strings.HasPrefix(*r.DfdImage, "/uploads/food-images/") &&
			!strings.Contains(*r.DfdImage, "..") && len(*r.DfdImage) <= 255,
			"dfd_image must be an uploaded food image path")
	}
	return v
}

// ActivityRecordRequest is the POST/PUT body for
// /members/{id}/activity-records (API_SPEC.md §8). DactDurationMin is a
// plain integer number of minutes — dact_duration_min is an INT column, not
// TIME (see API_SPEC.md §13 design notes).
type ActivityRecordRequest struct {
	DactDate        string   `json:"dact_date"`
	DactDurationMin int      `json:"dact_duration_min"`
	DactDistanceKm  *float64 `json:"dact_distance_km"`
	DactDetail      *string  `json:"dact_detail"`
	ActID           int      `json:"act_id"`
}

func (r ActivityRecordRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("dact_date", r.DactDate)
	if r.DactDate != "" {
		if _, err := utils.ParseDate(r.DactDate); err != nil {
			v.Check(false, "dact_date must be in YYYY-MM-DD format")
		}
	}
	// mirrors chk_dact_duration DB constraint — checked here too so an
	// out-of-range value fails as a clean 400, not a DB-error-mapped 500.
	v.Check(r.DactDurationMin > 0 && r.DactDurationMin <= 1440, "dact_duration_min must be between 1 and 1440")
	v.Check(r.ActID > 0, "act_id is required")
	// mirrors chk_dact_distance; whether the chosen activity may carry a
	// distance at all is checked in the handler (needs activity_master).
	if r.DactDistanceKm != nil {
		v.Check(*r.DactDistanceKm > 0 && *r.DactDistanceKm <= 999.99, "dact_distance_km must be between 0.01 and 999.99")
	}
	if r.DactDetail != nil {
		v.MaxLen("dact_detail", *r.DactDetail, 255)
	}
	return v
}

// ActivityRecordResponse adds a duration_minutes alias on top of the raw
// model so clients don't need to reach into dact_duration_min directly.
type ActivityRecordResponse struct {
	models.DailyActivityRecord
	DurationMinutes *int `json:"duration_minutes"`
}

func NewActivityRecordResponse(rec *models.DailyActivityRecord) ActivityRecordResponse {
	resp := ActivityRecordResponse{DailyActivityRecord: *rec}
	resp.DurationMinutes = rec.DactDurationMin
	return resp
}

// sleepFutureSlack is how far past "now" a wake-up time may be before the
// record counts as logged in advance.
const sleepFutureSlack = 5 * time.Minute

// SleepRecordRequest is the POST/PUT body for /members/{id}/sleep-records
// (API_SPEC.md §9). Start/end times are RFC3339
// ("2026-08-08T23:30:00Z") per §1's DATETIME format.
type SleepRecordRequest struct {
	DslpDate         string `json:"dslp_date"`
	DslpStartTime    string `json:"dslp_start_time"`
	DslpEndTime      string `json:"dslp_end_time"`
	DslpQualityScore *int   `json:"dslp_quality_score"`
}

func (r SleepRecordRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("dslp_date", r.DslpDate)
	if r.DslpDate != "" {
		if _, err := utils.ParseDate(r.DslpDate); err != nil {
			v.Check(false, "dslp_date must be in YYYY-MM-DD format")
		}
	}

	v.Required("dslp_start_time", r.DslpStartTime)
	v.Required("dslp_end_time", r.DslpEndTime)

	start, startErr := time.Parse(time.RFC3339, r.DslpStartTime)
	if r.DslpStartTime != "" && startErr != nil {
		v.Check(false, "dslp_start_time must be RFC3339, e.g. 2026-08-08T23:30:00Z")
	}
	end, endErr := time.Parse(time.RFC3339, r.DslpEndTime)
	if r.DslpEndTime != "" && endErr != nil {
		v.Check(false, "dslp_end_time must be RFC3339, e.g. 2026-08-09T06:45:00Z")
	}
	if startErr == nil && endErr == nil {
		v.Check(end.After(start), "dslp_end_time must be after dslp_start_time")
	}
	// A night can only be logged once it has ended — no records for future
	// dates or a wake-up time that hasn't happened yet. The slack absorbs
	// client clock drift and a server/client timezone offset on the date.
	if endErr == nil {
		v.Check(!end.After(time.Now().Add(sleepFutureSlack)), "dslp_end_time must not be in the future")
	}
	if r.DslpDate != "" {
		if d, err := utils.ParseDate(r.DslpDate); err == nil {
			v.Check(!d.After(utils.Today().AddDate(0, 0, 1)), "dslp_date must not be in the future")
		}
	}

	// dslp_quality_score is user-picked, never system-derived (§2.6) — so
	// unlike dslp_eval_result it has to come in on the request.
	v.Check(r.DslpQualityScore != nil, "dslp_quality_score is required")
	if r.DslpQualityScore != nil {
		v.OneOf("dslp_quality_score", *r.DslpQualityScore, 1, 2, 3)
	}

	return v
}

// SleepRecordResponse converts DslpEvalResult from the DB's raw string
// ("1"/"2"/"3") to the number API_SPEC.md §9's example response shows.
type SleepRecordResponse struct {
	DslpID           int      `json:"dslp_id"`
	DslpDate         string   `json:"dslp_date"`
	DslpStartTime    string   `json:"dslp_start_time"`
	DslpEndTime      string   `json:"dslp_end_time"`
	DslpTotalHours   *float64 `json:"dslp_total_hours"`
	DslpEvalResult   *int     `json:"dslp_eval_result"`
	DslpQualityScore *int     `json:"dslp_quality_score"`
	MbID             int      `json:"mb_id"`
}

func NewSleepRecordResponse(rec *models.DailySleepRecord) SleepRecordResponse {
	resp := SleepRecordResponse{
		DslpID:           rec.DslpID,
		DslpDate:         rec.DslpDate.Format("2006-01-02"),
		DslpStartTime:    rec.DslpStartTime.UTC().Format(time.RFC3339),
		DslpEndTime:      rec.DslpEndTime.UTC().Format(time.RFC3339),
		DslpTotalHours:   rec.DslpTotalHours,
		DslpQualityScore: rec.DslpQualityScore,
		MbID:             rec.MbID,
	}
	if rec.DslpEvalResult != nil {
		if v, err := strconv.Atoi(*rec.DslpEvalResult); err == nil {
			resp.DslpEvalResult = &v
		}
	}
	return resp
}
