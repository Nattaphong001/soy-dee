package handlers

import (
	"net/http"

	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type DashboardHandler struct {
	report *services.ReportService
}

func NewDashboardHandler(report *services.ReportService) *DashboardHandler {
	return &DashboardHandler{report: report}
}

func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	dashboard, err := h.report.Dashboard(r.Context(), mbID)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to build dashboard")
		return
	}

	utils.Success(w, http.StatusOK, dashboard, "ดึงข้อมูลสรุปสำเร็จ")
}

// maxReportDays caps ?from&to so one request can't scan unbounded history.
const maxReportDays = 366

// Report backs GET /members/{id}/report?from&to — defaults to the last 30 days.
func (h *DashboardHandler) Report(w http.ResponseWriter, r *http.Request) {
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
	end := utils.Today()
	if to != nil {
		end = *to
	}
	start := end.AddDate(0, 0, -29)
	if from != nil {
		start = *from
	}
	if start.After(end) {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "from must not be after to")
		return
	}
	if end.After(start.AddDate(0, 0, maxReportDays-1)) {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "date range must not exceed 366 days")
		return
	}

	report, err := h.report.MemberReport(r.Context(), mbID, start, end)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to build report")
		return
	}

	utils.Success(w, http.StatusOK, report, "ดึงรายงานสำเร็จ")
}
