package handlers

import (
	"errors"
	"net/http"
	"strings"

	"soydee-api/internal/dto"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type ActivityHandler struct {
	svc    *services.ActivityMasterService
	images *MasterImageStore
}

func NewActivityHandler(svc *services.ActivityMasterService, images *MasterImageStore) *ActivityHandler {
	return &ActivityHandler{svc: svc, images: images}
}

// UploadImage backs POST /admin/activities/image.
func (h *ActivityHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	h.images.Upload(activityImages)(w, r)
}

// prepare: same contract as FoodCategoryHandler.prepare.
func (h *ActivityHandler) prepare(w http.ResponseWriter, r *http.Request, req *dto.ActivityRequest, excludeID int) bool {
	req.ActName = strings.TrimSpace(req.ActName)
	if req.ActImages != nil && *req.ActImages == "" {
		req.ActImages = nil
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return false
	}
	dup, err := h.svc.NameExists(r.Context(), req.ActName, excludeID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to check activity name")
		return false
	}
	if dup {
		utils.Error(w, http.StatusConflict, utils.CodeDuplicateName, "activity name already exists")
		return false
	}
	return true
}

// List backs both GET /admin/activities and the public GET /activities
// (API_SPEC.md §5.2, §8).
func (h *ActivityHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list activities")
		return
	}

	utils.Success(w, http.StatusOK, items, "ดึงข้อมูลสำเร็จ")
}

func (h *ActivityHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	item, err := h.svc.FindByID(r.Context(), id)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "activity not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get activity")
		return
	}

	utils.Success(w, http.StatusOK, item, "ดึงข้อมูลสำเร็จ")
}

func (h *ActivityHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.ActivityRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if !h.prepare(w, r, &req, 0) {
		return
	}

	a := &models.ActivityMaster{ActName: req.ActName, ActImages: req.ActImages, ActCategory: models.ActCategoryOther,
		ActIntensity: models.ActIntensityModerate}
	if req.ActCategory != nil {
		a.ActCategory = *req.ActCategory
	}
	if req.ActIntensity != nil {
		a.ActIntensity = *req.ActIntensity
	}
	if req.ActHasDistance != nil {
		a.ActHasDistance = *req.ActHasDistance
	}
	id, err := h.svc.Create(r.Context(), a)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to create activity")
		return
	}

	utils.Success(w, http.StatusCreated, map[string]int64{"act_id": id}, "เพิ่มกิจกรรมสำเร็จ")
}

func (h *ActivityHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.ActivityRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if !h.prepare(w, r, &req, id) {
		return
	}

	// act_category / act_has_distance / act_intensity omitted -> keep what is stored
	current, err := h.svc.FindByID(r.Context(), id)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "activity not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load activity")
		return
	}
	a := &models.ActivityMaster{ActID: id, ActName: req.ActName, ActImages: req.ActImages,
		ActCategory: current.ActCategory, ActHasDistance: current.ActHasDistance, ActIntensity: current.ActIntensity}
	if req.ActCategory != nil {
		a.ActCategory = *req.ActCategory
	}
	if req.ActIntensity != nil {
		a.ActIntensity = *req.ActIntensity
	}
	if req.ActHasDistance != nil {
		a.ActHasDistance = *req.ActHasDistance
	}
	if err := h.svc.Update(r.Context(), a); errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "activity not found")
		return
	} else if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update activity")
		return
	}

	if current.ActImages != nil && (a.ActImages == nil || *a.ActImages != *current.ActImages) {
		h.images.Remove(activityImages, current.ActImages)
	}
	utils.Success(w, http.StatusOK, a, "แก้ไขกิจกรรมสำเร็จ")
}

func (h *ActivityHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	current, _ := h.svc.FindByID(r.Context(), id)
	err = h.svc.Delete(r.Context(), id)
	switch {
	case errors.Is(err, repositories.ErrNotFound):
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "activity not found")
		return
	case errors.Is(err, repositories.ErrInUse):
		utils.Error(w, http.StatusConflict, utils.CodeConflict, "activity is still referenced by activity records")
		return
	case err != nil:
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to delete activity")
		return
	}

	if current != nil {
		h.images.Remove(activityImages, current.ActImages)
	}
	utils.Success(w, http.StatusOK, nil, "ลบกิจกรรมสำเร็จ")
}
