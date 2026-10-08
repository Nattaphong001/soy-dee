package handlers

import (
	"errors"
	"math"
	"net/http"

	"soydee-api/internal/dto"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type BodyStatsHandler struct {
	svc *services.BodyStatsService
}

func NewBodyStatsHandler(svc *services.BodyStatsService) *BodyStatsHandler {
	return &BodyStatsHandler{svc: svc}
}

func (h *BodyStatsHandler) List(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	items, err := h.svc.ListByMember(r.Context(), mbID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list body stats")
		return
	}

	utils.Success(w, http.StatusOK, items, "ดึงข้อมูลสำเร็จ")
}

func (h *BodyStatsHandler) Create(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.BodyStatsRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	member, err := h.svc.FindMember(r.Context(), mbID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "member not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load member")
		return
	}
	if member.MbGender == nil || member.MbBirthDate == nil {
		utils.Error(w, http.StatusUnprocessableEntity, utils.CodeValidationError, "profile is missing gender or birth date")
		return
	}

	// §7.4: a Save click that didn't actually change weight/height/activity
	// level/target skips the insert — no fresh history row for identical
	// data (SOYDEE_AI_TASK.md §7.4).
	if latest, err := h.svc.LatestByMember(r.Context(), mbID); err == nil && bodyStatsUnchanged(latest, &req) {
		utils.Success(w, http.StatusOK, map[string]int64{"mbs_id": int64(latest.MbsID)}, "ไม่มีการเปลี่ยนแปลงข้อมูล")
		return
	} else if err != nil && !errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load latest body stats")
		return
	}

	bs := &models.MemberBodyStats{
		MbsWeight:        req.MbsWeight,
		MbsHeight:        req.MbsHeight,
		MbsActivityLevel: req.MbsActivityLevel,
		MbsTarget:        req.MbsTarget,
		MbID:             mbID,
	}

	mbsID, _, err := h.svc.CreateWithBmr(r.Context(), bs, *member.MbGender, *member.MbBirthDate)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save body stats")
		return
	}

	utils.Success(w, http.StatusCreated, map[string]int64{"mbs_id": mbsID}, "บันทึกข้อมูลร่างกายสำเร็จ")
}

const floatEqTolerance = 0.001

func bodyStatsUnchanged(latest *models.MemberBodyStats, req *dto.BodyStatsRequest) bool {
	return floatPtrEqual(latest.MbsWeight, req.MbsWeight) &&
		floatPtrEqual(latest.MbsHeight, req.MbsHeight) &&
		floatPtrEqual(latest.MbsActivityLevel, req.MbsActivityLevel) &&
		intPtrEqual(latest.MbsTarget, req.MbsTarget)
}

func floatPtrEqual(a, b *float64) bool {
	if a == nil || b == nil {
		return a == b
	}
	return math.Abs(*a-*b) < floatEqTolerance
}

func intPtrEqual(a, b *int) bool {
	if a == nil || b == nil {
		return a == b
	}
	return *a == *b
}

func (h *BodyStatsHandler) Latest(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	latest, err := h.svc.LatestByMember(r.Context(), mbID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "no body stats found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get latest body stats")
		return
	}

	utils.Success(w, http.StatusOK, latest, "ดึงข้อมูลสำเร็จ")
}
