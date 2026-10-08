package models

// ActivityMaster maps to the activity_master table.
type ActivityMaster struct {
	ActID     int     `json:"act_id" db:"act_id"`
	ActName   string  `json:"act_name" db:"act_name"`
	ActImages *string `json:"act_images" db:"act_images"`
	// ActCategory groups activities in the add-entry sheet: see the
	// ActCategory* constants. New activities default to ActCategoryOther.
	ActCategory int `json:"act_category" db:"act_category"`
	// ActHasDistance = the member may record dact_distance_km for it.
	ActHasDistance bool `json:"act_has_distance" db:"act_has_distance"`
	// ActIntensity is how strenuous the activity is (ActIntensity* constants);
	// the member page colours each activity by it. New activities default to
	// ActIntensityModerate.
	ActIntensity int `json:"act_intensity" db:"act_intensity"`
}

const (
	ActIntensityLight    = 1 // เบา
	ActIntensityModerate = 2 // ปานกลาง (default)
	ActIntensityVigorous = 3 // หนัก
	ActIntensityMax      = 4 // หนักมาก
)

const (
	ActCategoryCardio  = 1 // คาร์ดิโอ
	ActCategoryFitness = 2 // ฟิตเนส
	ActCategorySport   = 3 // กีฬา
	ActCategoryDaily   = 4 // กิจวัตรประจำวัน
	ActCategoryOther   = 5 // อื่นๆ (default)
)
