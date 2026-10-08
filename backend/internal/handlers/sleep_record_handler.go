package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"soydee-api/internal/dto"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type SleepRecordHandler struct {
	svc  *services.SleepRecordService
	eval *services.SleepEvalService
}

func NewSleepRecordHandler(svc *services.SleepRecordService, eval *services.SleepEvalService) *SleepRecordHandler {
	return &SleepRecordHandler{svc: svc, eval: eval}
}

func (h *SleepRecordHandler) List(w http.ResponseWriter, r *http.Request) {
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

	items, err := h.svc.ListByMemberAndDate(r.Context(), mbID, date)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list sleep records")
		return
	}

	resp := make([]dto.SleepRecordResponse, 0, len(items))
	for i := range items {
		resp = append(resp, dto.NewSleepRecordResponse(&items[i]))
	}

	utils.Success(w, http.StatusOK, resp, "ดึงข้อมูลสำเร็จ")
}

func (h *SleepRecordHandler) Get(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dslpID, err := urlParamInt(r, "dslp_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dslp_id")
		return
	}

	record, err := h.svc.FindByID(r.Context(), dslpID)
	if errors.Is(err, repositories.ErrNotFound) || (err == nil && record.MbID != mbID) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "sleep record not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get sleep record")
		return
	}

	utils.Success(w, http.StatusOK, dto.NewSleepRecordResponse(record), "ดึงข้อมูลสำเร็จ")
}

func (h *SleepRecordHandler) Create(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.SleepRecordRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	date, _ := utils.ParseDate(req.DslpDate)
	start, _ := time.Parse(time.RFC3339, req.DslpStartTime)
	end, _ := time.Parse(time.RFC3339, req.DslpEndTime)

	evaluation := h.eval.Evaluate(start, end)
	evalResultStr := strconv.Itoa(evaluation.EvalResult)

	record := &models.DailySleepRecord{
		DslpDate:         date,
		DslpStartTime:    start,
		DslpEndTime:      end,
		DslpTotalHours:   &evaluation.TotalHours,
		DslpEvalResult:   &evalResultStr,
		DslpQualityScore: req.DslpQualityScore,
		MbID:             mbID,
	}

	id, err := h.svc.Create(r.Context(), record)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save sleep record")
		return
	}
	record.DslpID = int(id)

	utils.Success(w, http.StatusCreated, dto.NewSleepRecordResponse(record), "บันทึกข้อมูลการนอนสำเร็จ")
}

func (h *SleepRecordHandler) Update(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dslpID, err := urlParamInt(r, "dslp_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dslp_id")
		return
	}

	existing, err := h.svc.FindByID(r.Context(), dslpID)
	if errors.Is(err, repositories.ErrNotFound) || (err == nil && existing.MbID != mbID) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "sleep record not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load sleep record")
		return
	}

	var req dto.SleepRecordRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	date, _ := utils.ParseDate(req.DslpDate)
	start, _ := time.Parse(time.RFC3339, req.DslpStartTime)
	end, _ := time.Parse(time.RFC3339, req.DslpEndTime)

	evaluation := h.eval.Evaluate(start, end)
	evalResultStr := strconv.Itoa(evaluation.EvalResult)

	existing.DslpDate = date
	existing.DslpStartTime = start
	existing.DslpEndTime = end
	existing.DslpTotalHours = &evaluation.TotalHours
	existing.DslpEvalResult = &evalResultStr
	existing.DslpQualityScore = req.DslpQualityScore

	if err := h.svc.Update(r.Context(), existing); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update sleep record")
		return
	}

	utils.Success(w, http.StatusOK, dto.NewSleepRecordResponse(existing), "แก้ไขบันทึกการนอนสำเร็จ")
}

func (h *SleepRecordHandler) Delete(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dslpID, err := urlParamInt(r, "dslp_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dslp_id")
		return
	}

	if err := h.svc.Delete(r.Context(), dslpID, mbID); errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "sleep record not found")
		return
	} else if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to delete sleep record")
		return
	}

	utils.Success(w, http.StatusOK, nil, "ลบบันทึกการนอนสำเร็จ")
}
