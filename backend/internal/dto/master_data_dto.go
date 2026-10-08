package dto

import (
	"strings"

	"soydee-api/internal/models"
	"soydee-api/pkg/utils"
)

// URL path prefixes accepted for fd_images / act_images — must match what
// MasterImageStore.Upload hands back and the /uploads/* static route.
const (
	FoodCategoryImagePrefix = "/uploads/food-category/"
	ActivityImagePrefix     = "/uploads/activity/"
)

// validMasterImage: nil / "" (no image) or a path directly under prefix
// (no sub-directories, no traversal) — the client can only reference files
// that the upload endpoint produced.
func validMasterImage(p *string, prefix string) bool {
	if p == nil || *p == "" {
		return true
	}
	rest, ok := strings.CutPrefix(*p, prefix)
	return ok && rest != "" && !strings.ContainsAny(rest, "/\\") && !strings.Contains(rest, "..")
}

// FoodCategoryRequest is the POST/PUT body for /admin/food-categories
// (API_SPEC.md §5.1).
type FoodCategoryRequest struct {
	FdName         string  `json:"fd_name"`
	FdTrafficLight *int    `json:"fd_traffic_light"`
	FdImages       *string `json:"fd_images"`
}

func (r FoodCategoryRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("fd_name", r.FdName)
	v.MaxLen("fd_name", r.FdName, 100)
	v.Check(validMasterImage(r.FdImages, FoodCategoryImagePrefix), "fd_images must be an uploaded food-category image path")
	// Required server-side too — DB is NOT NULL DEFAULT 2, but silently
	// substituting a default the admin never picked is exactly the "ปล่อยว่าง"
	// gap SOYDEE_AI_TASK.md §5 หน้า8 says must be rejected, not defaulted.
	v.Check(r.FdTrafficLight != nil, "fd_traffic_light is required")
	if r.FdTrafficLight != nil {
		v.OneOf("fd_traffic_light", *r.FdTrafficLight, 1, 2, 3)
	}
	return v
}

// ActivityRequest is the POST/PUT body for /admin/activities
// (API_SPEC.md §5.2).
type ActivityRequest struct {
	ActName   string  `json:"act_name"`
	ActImages *string `json:"act_images"`
	// Optional: omitted on create -> ActCategoryOther / no distance; omitted on
	// update -> keep the stored value (so an older admin page can't reset them).
	ActCategory    *int  `json:"act_category"`
	ActHasDistance *bool `json:"act_has_distance"`
	// Optional like the two above: omitted on create -> ActIntensityModerate.
	ActIntensity *int `json:"act_intensity"`
}

func (r ActivityRequest) Validate() *utils.Validator {
	v := utils.NewValidator()
	v.Required("act_name", r.ActName)
	v.MaxLen("act_name", r.ActName, 100)
	v.Check(validMasterImage(r.ActImages, ActivityImagePrefix), "act_images must be an uploaded activity image path")
	if r.ActCategory != nil {
		v.OneOf("act_category", *r.ActCategory, models.ActCategoryCardio, models.ActCategoryFitness,
			models.ActCategorySport, models.ActCategoryDaily, models.ActCategoryOther)
	}
	if r.ActIntensity != nil {
		v.OneOf("act_intensity", *r.ActIntensity, models.ActIntensityLight, models.ActIntensityModerate,
			models.ActIntensityVigorous, models.ActIntensityMax)
	}
	return v
}
