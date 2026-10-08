package dto

// ---- Member dashboard (API_SPEC.md §10.1) ----

type BMISummary struct {
	Value      *float64 `json:"value"`
	EvalResult *int     `json:"eval_result"`
}

type BMRSummary struct {
	BMR        *float64 `json:"bmr"`
	TDEE       *float64 `json:"tdee"`
	TDEETarget *float64 `json:"tdee_target"`
}

type TrafficLightCounts struct {
	Green  int `json:"green"`
	Yellow int `json:"yellow"`
	Red    int `json:"red"`
}

type TodayFoodSummary struct {
	MealCount      int                `json:"meal_count"`
	ByTrafficLight TrafficLightCounts `json:"by_traffic_light"`
}

type TodayActivitySummary struct {
	ActivityCount    int `json:"activity_count"`
	TotalDurationMin int `json:"total_duration_min"`
}

type LastSleepSummary struct {
	Date         *string  `json:"date"`
	TotalHours   *float64 `json:"total_hours"`
	QualityScore *int     `json:"quality_score"`
}

type DashboardResponse struct {
	LatestBMI             BMISummary           `json:"latest_bmi"`
	LatestBMR             BMRSummary           `json:"latest_bmr"`
	TodayFoodSummary      TodayFoodSummary     `json:"today_food_summary"`
	TodayActivitySummary  TodayActivitySummary `json:"today_activity_summary"`
	LastSleep             *LastSleepSummary    `json:"last_sleep"`
	WeeklyActivityMinutes []int                `json:"weekly_activity_minutes"`
}

// ---- Admin reports (API_SPEC.md §10.2) ----

type DateRange struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type AdminReportResponse struct {
	Type    string      `json:"type"`
	Range   *DateRange  `json:"range,omitempty"`
	Summary interface{} `json:"summary"`
	Items   interface{} `json:"items"`
	Page    int         `json:"page"`
	Limit   int         `json:"limit"`
	Total   int         `json:"total"`
}

// TopCountItem is one row of a "top N by count" breakdown (top food
// categories, top activities).
type TopCountItem struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type FoodReportSummary struct {
	TrafficLightCounts
	// Uncategorized = records whose food category was deleted / never set.
	Uncategorized int            `json:"uncategorized"`
	TopCategories []TopCountItem `json:"top_categories"`
}

type ActivityReportSummary struct {
	ActivityCount    int            `json:"activity_count"`
	TotalDurationMin int            `json:"total_duration_min"`
	TopActivities    []TopCountItem `json:"top_activities"`
}

type SleepReportSummary struct {
	AvgSleepHours    float64        `json:"avg_sleep_hours"`
	QualityBreakdown map[string]int `json:"quality_breakdown"`
}

type BMIReportItem struct {
	MbID          int     `json:"mb_id"`
	MbFullName    string  `json:"mb_full_name"`
	MbhBMI        float64 `json:"mbh_bmi"`
	MbhEvalResult int     `json:"mbh_eval_result"`
	MbhRecordDate string  `json:"mbh_record_date"`
}

type FoodReportItem struct {
	MbID           int    `json:"mb_id"`
	MbFullName     string `json:"mb_full_name"`
	DfdID          int    `json:"dfd_id"`
	DfdDate        string `json:"dfd_date"`
	DfdFoodName    string `json:"dfd_food_name"`
	FdID           *int   `json:"fd_id"`
	FdName         string `json:"fd_name"`
	FdTrafficLight *int   `json:"fd_traffic_light"`
}

type ActivityReportItem struct {
	MbID            int    `json:"mb_id"`
	MbFullName      string `json:"mb_full_name"`
	DactID          int    `json:"dact_id"`
	DactDate        string `json:"dact_date"`
	ActID           int    `json:"act_id"`
	ActName         string `json:"act_name"`
	DurationMinutes int    `json:"duration_minutes"`
}

type SleepReportItem struct {
	MbID             int     `json:"mb_id"`
	MbFullName       string  `json:"mb_full_name"`
	DslpID           int     `json:"dslp_id"`
	DslpDate         string  `json:"dslp_date"`
	DslpTotalHours   float64 `json:"dslp_total_hours"`
	DslpEvalResult   int     `json:"dslp_eval_result"`
	DslpQualityScore int     `json:"dslp_quality_score"`
}

// ---- Admin member listing (API_SPEC.md §10.3, §10.4) ----

type AdminMemberSummary struct {
	MbID          int      `json:"mb_id"`
	MbUserName    string   `json:"mb_user_name"`
	MbFullName    string   `json:"mb_full_name"`
	MbGender      *int     `json:"mb_gender"`
	MbProfilePic  *string  `json:"mb_profile_pic"`
	Age           *int     `json:"age"`
	MbsWeight     *float64 `json:"mbs_weight"`
	MbsHeight     *float64 `json:"mbs_height"`
	MbsTarget     *int     `json:"mbs_target"`
	LatestBMI     *float64 `json:"latest_bmi"`
	MbhEvalResult *int     `json:"mbh_eval_result"`
	MbCreatedAt   string   `json:"mb_created_at"`
}

type AdminMemberDetail struct {
	Profile     AdminMemberSummary `json:"profile"`
	BodyStats   interface{}        `json:"body_stats"`
	BmrHistory  interface{}        `json:"bmr_history"`
	FoodRecent  interface{}        `json:"food_records_recent"`
	ActRecent   interface{}        `json:"activity_records_recent"`
	SleepRecent interface{}        `json:"sleep_records_recent"`
}

// ---- Admin system overview (API_SPEC.md §10.5) ----

type DailyRecordCount struct {
	Date     string `json:"date"`
	Food     int    `json:"food"`
	Activity int    `json:"activity"`
	Sleep    int    `json:"sleep"`
}

type AdminStatsResponse struct {
	TotalMembers        int                `json:"total_members"`
	NewMembersThisMonth int                `json:"new_members_this_month"`
	FoodCategoryCount   int                `json:"food_category_count"`
	ActivityCount       int                `json:"activity_count"`
	DailyRecords        []DailyRecordCount `json:"daily_records"`
}
