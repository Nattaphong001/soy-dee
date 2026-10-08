package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"soydee-api/internal/dto"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type FoodCategoryHandler struct {
	svc    *services.FoodCategoryService
	images *MasterImageStore
}

func NewFoodCategoryHandler(svc *services.FoodCategoryService, images *MasterImageStore) *FoodCategoryHandler {
	return &FoodCategoryHandler{svc: svc, images: images}
}

// UploadImage backs POST /admin/food-categories/image.
func (h *FoodCategoryHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	h.images.Upload(foodCategoryImages)(w, r)
}

// prepare trims the name, maps "" image to nil and rejects a name another
// category already uses. It writes the error response itself; ok=false means
// the caller must stop.
func (h *FoodCategoryHandler) prepare(w http.ResponseWriter, r *http.Request, req *dto.FoodCategoryRequest, excludeID int) bool {
	req.FdName = strings.TrimSpace(req.FdName)
	if req.FdImages != nil && *req.FdImages == "" {
		req.FdImages = nil
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return false
	}
	dup, err := h.svc.NameExists(r.Context(), req.FdName, excludeID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to check food category name")
		return false
	}
	if dup {
		utils.Error(w, http.StatusConflict, utils.CodeDuplicateName, "food category name already exists")
		return false
	}
	return true
}

// List backs both GET /admin/food-categories and the public
// GET /food-categories (API_SPEC.md §5.1, §7).
func (h *FoodCategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	var trafficLight *int
	if raw := r.URL.Query().Get("traffic_light"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "traffic_light must be an integer")
			return
		}
		trafficLight = &v
	}

	items, err := h.svc.List(r.Context(), trafficLight)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list food categories")
		return
	}

	utils.Success(w, http.StatusOK, items, "ดึงข้อมูลสำเร็จ")
}

func (h *FoodCategoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	item, err := h.svc.FindByID(r.Context(), id)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "food category not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get food category")
		return
	}

	utils.Success(w, http.StatusOK, item, "ดึงข้อมูลสำเร็จ")
}

func (h *FoodCategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.FoodCategoryRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if !h.prepare(w, r, &req, 0) {
		return
	}

	f := &models.FoodCategory{FdName: req.FdName, FdTrafficLight: req.FdTrafficLight, FdImages: req.FdImages}
	id, err := h.svc.Create(r.Context(), f)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to create food category")
		return
	}

	utils.Success(w, http.StatusCreated, map[string]int64{"fd_id": id}, "เพิ่มประเภทอาหารสำเร็จ")
}

func (h *FoodCategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.FoodCategoryRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if !h.prepare(w, r, &req, id) {
		return
	}

	current, err := h.svc.FindByID(r.Context(), id)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "food category not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load food category")
		return
	}

	f := &models.FoodCategory{FdID: id, FdName: req.FdName, FdTrafficLight: req.FdTrafficLight, FdImages: req.FdImages}
	if err := h.svc.Update(r.Context(), f); errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "food category not found")
		return
	} else if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update food category")
		return
	}

	if current.FdImages != nil && (f.FdImages == nil || *f.FdImages != *current.FdImages) {
		h.images.Remove(foodCategoryImages, current.FdImages)
	}
	utils.Success(w, http.StatusOK, f, "แก้ไขประเภทอาหารสำเร็จ")
}

func (h *FoodCategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	current, _ := h.svc.FindByID(r.Context(), id)
	err = h.svc.Delete(r.Context(), id)
	switch {
	case errors.Is(err, repositories.ErrNotFound):
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "food category not found")
		return
	case errors.Is(err, repositories.ErrInUse):
		utils.Error(w, http.StatusConflict, utils.CodeConflict, "food category is still referenced by food records")
		return
	case err != nil:
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to delete food category")
		return
	}

	if current != nil {
		h.images.Remove(foodCategoryImages, current.FdImages)
	}
	utils.Success(w, http.StatusOK, nil, "ลบประเภทอาหารสำเร็จ")
}
