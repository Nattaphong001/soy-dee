package handlers

import (
	"errors"
	"net/http"

	"soydee-api/internal/repositories"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type AdminReportHandler struct {
	report *services.ReportService
}

func NewAdminReportHandler(report *services.ReportService) *AdminReportHandler {
	return &AdminReportHandler{report: report}
}

var validReportTypes = map[string]bool{"food": true, "activity": true, "sleep": true, "bmi": true, "members": true}

func (h *AdminReportHandler) Reports(w http.ResponseWriter, r *http.Request) {
	reportType := r.URL.Query().Get("type")
	if !validReportTypes[reportType] {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "type must be one of food, activity, sleep, bmi, members")
		return
	}

	from, to, err := parseDateRange(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "from/to must be in YYYY-MM-DD format")
		return
	}

	mbID, err := optionalIntQuery(r, "mb_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "mb_id must be an integer")
		return
	}

	// Type-specific optional filters, all query-string driven per the admin
	// panel's report filter forms — irrelevant ones for a given `type` are
	// simply unused by that report's service function.
	gender, err := optionalIntQuery(r, "gender")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "gender must be an integer")
		return
	}
	bmiEval, err := optionalIntQuery(r, "eval")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "eval must be an integer")
		return
	}
	trafficLight, err := optionalIntQuery(r, "traffic_light")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "traffic_light must be an integer")
		return
	}
	mealType, err := optionalIntQuery(r, "meal_type")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "meal_type must be an integer")
		return
	}
	actID, err := optionalIntQuery(r, "act_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "act_id must be an integer")
		return
	}

	limit, _, page := parsePagination(r)

	result, err := h.report.AdminReport(r.Context(), reportType, services.ReportFilter{
		From: from, To: to, MbID: mbID,
		Gender: gender, BmiEval: bmiEval,
		TrafficLight: trafficLight, MealType: mealType,
		ActID: actID, SleepEval: bmiEval,
		Page: page, Limit: limit,
	})
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to build report")
		return
	}

	utils.Success(w, http.StatusOK, result, "ดึงรายงานสำเร็จ")
}

func (h *AdminReportHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	limit, offset, page := parsePagination(r)

	gender, err := optionalIntQuery(r, "gender")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "gender must be an integer")
		return
	}
	bmiEval, err := optionalIntQuery(r, "bmi_category")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "bmi_category must be an integer")
		return
	}
	from, to, err := parseDateRange(r)
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "date_from/date_to must be in YYYY-MM-DD format")
		return
	}

	items, total, err := h.report.ListMembers(r.Context(), services.MemberListFilter{
		Search: search, Gender: gender, BmiEval: bmiEval, From: from, To: to,
	}, limit, offset)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list members")
		return
	}

	utils.Success(w, http.StatusOK, map[string]interface{}{
		"items": items,
		"page":  page,
		"limit": limit,
		"total": total,
	}, "ดึงข้อมูลสำเร็จ")
}

// Stats backs GET /admin/stats — the admin panel's system-overview page.
func (h *AdminReportHandler) Stats(w http.ResponseWriter, r *http.Request) {
	result, err := h.report.Stats(r.Context())
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to build stats")
		return
	}
	utils.Success(w, http.StatusOK, result, "ดึงภาพรวมระบบสำเร็จ")
}

func (h *AdminReportHandler) MemberDetail(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	detail, err := h.report.MemberDetail(r.Context(), mbID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "member not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get member detail")
		return
	}

	utils.Success(w, http.StatusOK, detail, "ดึงข้อมูลสำเร็จ")
}
