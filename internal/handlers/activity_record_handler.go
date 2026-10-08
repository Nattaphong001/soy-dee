package handlers

import (
	"errors"
	"net/http"

	"soydee-api/internal/dto"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/pkg/utils"
)

type ActivityRecordHandler struct {
	repo       *repositories.ActivityRecordRepository
	activities *repositories.ActivityRepository
}

func NewActivityRecordHandler(repo *repositories.ActivityRecordRepository, activities *repositories.ActivityRepository) *ActivityRecordHandler {
	return &ActivityRecordHandler{repo: repo, activities: activities}
}

// checkActivity confirms act_id exists and that a distance is only sent for an
// activity flagged act_has_distance. It writes the error response itself and
// reports whether the request may continue.
func (h *ActivityRecordHandler) checkActivity(w http.ResponseWriter, r *http.Request, req dto.ActivityRecordRequest) bool {
	act, err := h.activities.FindByID(r.Context(), req.ActID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "act_id does not exist")
		return false
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load activity")
		return false
	}
	if req.DactDistanceKm != nil && !act.ActHasDistance {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "dact_distance_km is not supported for this activity")
		return false
	}
	return true
}

func (h *ActivityRecordHandler) List(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	date := utils.Today()
	if raw := r.URL.Query().Get("date"); raw != "" {
		date, err = utils.ParseDate(raw)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "date must be in YYYY-MM-DD format")
			return
		}
	}

	items, err := h.repo.ListByMemberAndDate(r.Context(), mbID, date)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list activity records")
		return
	}

	resp := make([]dto.ActivityRecordResponse, 0, len(items))
	for i := range items {
		resp = append(resp, dto.NewActivityRecordResponse(&items[i]))
	}

	utils.Success(w, http.StatusOK, resp, "ดึงข้อมูลสำเร็จ")
}

func (h *ActivityRecordHandler) Get(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dactID, err := urlParamInt(r, "dact_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dact_id")
		return
	}

	record, err := h.repo.FindByID(r.Context(), dactID)
	if errors.Is(err, repositories.ErrNotFound) || (err == nil && record.MbID != mbID) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "activity record not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get activity record")
		return
	}

	utils.Success(w, http.StatusOK, dto.NewActivityRecordResponse(record), "ดึงข้อมูลสำเร็จ")
}

func (h *ActivityRecordHandler) Create(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.ActivityRecordRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	if !h.checkActivity(w, r, req) {
		return
	}

	date, _ := utils.ParseDate(req.DactDate)
	duration := req.DactDurationMin

	record := &models.DailyActivityRecord{
		DactDate:        date,
		DactDurationMin: &duration,
		DactDistanceKm:  req.DactDistanceKm,
		DactDetail:      req.DactDetail,
		MbID:            mbID,
		ActID:           req.ActID,
	}

	id, err := h.repo.Create(r.Context(), record)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save activity record")
		return
	}

	utils.Success(w, http.StatusCreated, map[string]int64{"dact_id": id}, "บันทึกกิจกรรมสำเร็จ")
}

func (h *ActivityRecordHandler) Update(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dactID, err := urlParamInt(r, "dact_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dact_id")
		return
	}

	existing, err := h.repo.FindByID(r.Context(), dactID)
	if errors.Is(err, repositories.ErrNotFound) || (err == nil && existing.MbID != mbID) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "activity record not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load activity record")
		return
	}

	var req dto.ActivityRecordRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	if !h.checkActivity(w, r, req) {
		return
	}

	date, _ := utils.ParseDate(req.DactDate)
	duration := req.DactDurationMin
	existing.DactDate = date
	existing.DactDurationMin = &duration
	existing.DactDistanceKm = req.DactDistanceKm
	existing.DactDetail = req.DactDetail
	existing.ActID = req.ActID

	if err := h.repo.Update(r.Context(), existing); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update activity record")
		return
	}

	utils.Success(w, http.StatusOK, dto.NewActivityRecordResponse(existing), "แก้ไขบันทึกกิจกรรมสำเร็จ")
}

func (h *ActivityRecordHandler) Delete(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dactID, err := urlParamInt(r, "dact_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dact_id")
		return
	}

	if err := h.repo.Delete(r.Context(), dactID, mbID); errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "activity record not found")
		return
	} else if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to delete activity record")
		return
	}

	utils.Success(w, http.StatusOK, nil, "ลบบันทึกกิจกรรมสำเร็จ")
}
