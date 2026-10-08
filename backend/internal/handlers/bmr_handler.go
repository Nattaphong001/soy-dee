package handlers

import (
	"errors"
	"net/http"

	"soydee-api/internal/dto"
	"soydee-api/internal/repositories"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type BMRHandler struct {
	service *services.BMRService
}

func NewBMRHandler(service *services.BMRService) *BMRHandler {
	return &BMRHandler{service: service}
}

func (h *BMRHandler) Calculate(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.BmrCalculateRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	recordDate, _ := utils.ParseDate(req.MbhRecordDate)

	history, err := h.service.Calculate(r.Context(), mbID, req.MbsID, recordDate)
	switch {
	case errors.Is(err, repositories.ErrNotFound):
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "member not found")
		return
	case errors.Is(err, services.ErrIncompleteBodyData):
		utils.Error(w, http.StatusUnprocessableEntity, utils.CodeUnprocessableEntity, "no body stats available to calculate BMR")
		return
	case err != nil:
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to calculate BMR")
		return
	}

	utils.Success(w, http.StatusCreated, history, "คำนวณสำเร็จ")
}

func (h *BMRHandler) History(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	from, to, err := parseDateRange(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "from/to must be in YYYY-MM-DD format")
		return
	}
	limit, offset, page := parsePagination(r)

	items, total, err := h.service.ListByMember(r.Context(), mbID, from, to, limit, offset)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list BMR history")
		return
	}

	utils.Success(w, http.StatusOK, map[string]interface{}{
		"items": items,
		"page":  page,
		"limit": limit,
		"total": total,
	}, "ดึงข้อมูลสำเร็จ")
}

func (h *BMRHandler) Latest(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	latest, err := h.service.LatestByMember(r.Context(), mbID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "no BMR history found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get latest BMR")
		return
	}

	utils.Success(w, http.StatusOK, latest, "ดึงข้อมูลสำเร็จ")
}
