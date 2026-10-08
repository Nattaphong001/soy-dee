package dto

// ---- Member self-report: GET /members/{id}/report?from&to ----
//
// Enum fields (traffic light, meal type, BMI/sleep eval, quality, category,
// target) are returned as raw codes; the frontend maps them to i18n labels.

// ReportItemsCap is the max rows returned in each section's "items" table;
// items_total carries the real count so the UI can say "showing latest N".
const ReportItemsCap = 300

type MemberReportResponse struct {
	Range    MemberReportRange    `json:"range"`
	Overview MemberReportOverview `json:"overview"`
	Body     MemberReportBody     `json:"body"`
	Food     MemberReportFood     `json:"food"`
	Activity MemberReportActivity `json:"activity"`
	Sleep    MemberReportSleep    `json:"sleep"`
}

type MemberReportRange struct {
	From string `json:"from"`
	To   string `json:"to"`
	Days int    `json:"days"`
}

type MemberReportOverview struct {
	BMI              *float64           `json:"bmi"`
	BMIEval          *int               `json:"bmi_eval"`
	TDEE             *float64           `json:"tdee"`
	TDEETarget       *float64           `json:"tdee_target"`
	LoggedDays       int                `json:"logged_days"`
	RangeDays        int                `json:"range_days"`
	ConsistencyPct   int                `json:"consistency_pct"`
	StreakDays       int                `json:"streak_days"`
	MealCount        int                `json:"meal_count"`
	ByTrafficLight   TrafficLightCounts `json:"by_traffic_light"`
	ActivityTotalMin int                `json:"activity_total_min"`
	SleepAvgHours    *float64           `json:"sleep_avg_hours"`
}

// ---- Body ----

type ReportBodyPoint struct {
	Date          string   `json:"date"`
	Weight        *float64 `json:"weight"`
	Height        *float64 `json:"height"`
	Target        *int     `json:"target"`
	ActivityLevel *float64 `json:"activity_level"`
	BMI           *float64 `json:"bmi"`
	BMIEval       *int     `json:"bmi_eval"`
	BMR           *float64 `json:"bmr"`
	TDEE          *float64 `json:"tdee"`
	TDEETarget    *float64 `json:"tdee_target"`
}

type MemberReportBody struct {
	Latest       *ReportBodyPoint  `json:"latest"`        // latest ever, not range-bound
	WeightChange *float64          `json:"weight_change"` // last - first weight within range (nil if < 2 points)
	History      []ReportBodyPoint `json:"history"`       // in range, oldest -> newest
}

// ---- Food ----

type ReportFoodDay struct {
	Date   string `json:"date"`
	Green  int    `json:"green"`
	Yellow int    `json:"yellow"`
	Red    int    `json:"red"`
	Total  int    `json:"total"`
}

type ReportFoodCategory struct {
	Name         string `json:"name"`
	TrafficLight *int   `json:"traffic_light"`
	Count        int    `json:"count"`
}

type ReportMealCount struct {
	MealType int `json:"meal_type"`
	Count    int `json:"count"`
}

type ReportFoodItem struct {
	Date         string  `json:"date"`
	Time         string  `json:"time"`
	MealType     *int    `json:"meal_type"`
	FoodName     *string `json:"food_name"`
	Amount       *string `json:"amount"`
	CategoryName *string `json:"category_name"`
	TrafficLight *int    `json:"traffic_light"`
}

type MemberReportFood struct {
	MealCount      int                  `json:"meal_count"`
	DaysLogged     int                  `json:"days_logged"`
	AvgPerDay      float64              `json:"avg_per_day"` // meals per logged day
	ByTrafficLight TrafficLightCounts   `json:"by_traffic_light"`
	TopCategories  []ReportFoodCategory `json:"top_categories"`
	ByMeal         []ReportMealCount    `json:"by_meal"`
	Daily          []ReportFoodDay      `json:"daily"` // full range, zero-filled
	Items          []ReportFoodItem     `json:"items"` // newest first, capped
	ItemsTotal     int                  `json:"items_total"`
}

// ---- Activity ----

type ReportActivityDay struct {
	Date       string  `json:"date"`
	Minutes    int     `json:"minutes"`
	DistanceKm float64 `json:"distance_km"`
}

type ReportActivityGroup struct {
	Category int    `json:"category,omitempty"`
	Name     string `json:"name,omitempty"`
	Count    int    `json:"count"`
	Minutes  int    `json:"minutes"`
}

type ReportActivityItem struct {
	Date        string   `json:"date"`
	Name        string   `json:"name"`
	Category    int      `json:"category"`
	Detail      *string  `json:"detail"`
	DurationMin *int     `json:"duration_min"`
	DistanceKm  *float64 `json:"distance_km"`
}

type MemberReportActivity struct {
	Count         int                   `json:"count"`
	TotalMin      int                   `json:"total_min"`
	DaysActive    int                   `json:"days_active"`
	AvgMinPerDay  float64               `json:"avg_min_per_day"` // per active day
	TotalDistance float64               `json:"total_distance_km"`
	DistanceCount int                   `json:"distance_count"` // sessions that logged a distance
	AvgDistance   float64               `json:"avg_distance_km"`
	Daily         []ReportActivityDay   `json:"daily"` // full range, zero-filled
	ByCategory    []ReportActivityGroup `json:"by_category"`
	TopActivities []ReportActivityGroup `json:"top_activities"`
	Items         []ReportActivityItem  `json:"items"`
	ItemsTotal    int                   `json:"items_total"`
}

// ---- Sleep ----

type ReportSleepItem struct {
	Date       string   `json:"date"`
	Start      string   `json:"start"` // "2006-01-02 15:04"
	End        string   `json:"end"`
	TotalHours *float64 `json:"total_hours"`
	Eval       *int     `json:"eval"`
	Quality    *int     `json:"quality"`
}

type MemberReportSleep struct {
	Nights      int               `json:"nights"`
	AvgHours    *float64          `json:"avg_hours"`
	MaxHours    *float64          `json:"max_hours"`
	MinHours    *float64          `json:"min_hours"`
	AvgBedtime  *string           `json:"avg_bedtime"` // "HH:MM"
	AvgWakeTime *string           `json:"avg_wake_time"`
	ByEval      []int             `json:"by_eval"`    // index 0..2 = eval 1..3
	ByQuality   []int             `json:"by_quality"` // index 0..2 = quality 1..3
	Items       []ReportSleepItem `json:"items"`      // oldest -> newest, all nights in range
}
