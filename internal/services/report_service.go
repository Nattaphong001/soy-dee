package services

import (
	"context"
	"time"

	"soydee-api/internal/dto"
	"soydee-api/internal/repositories"
)

// Filter types are owned by the repositories package (they drive its SQL
// builders); re-exported so handlers only depend on services.
type (
	ReportFilter     = repositories.ReportFilter
	MemberListFilter = repositories.MemberListFilter
)

// reportStore is the read-model query layer behind ReportService
// (API_SPEC.md §10: member dashboard/report + admin reports).
type reportStore interface {
	Dashboard(ctx context.Context, mbID int) (*dto.DashboardResponse, error)
	MemberReport(ctx context.Context, mbID int, from, to time.Time) (*dto.MemberReportResponse, error)
	AdminReport(ctx context.Context, reportType string, f ReportFilter) (*dto.AdminReportResponse, error)
	ListMembers(ctx context.Context, f MemberListFilter, limit, offset int) ([]dto.AdminMemberSummary, int, error)
	MemberDetail(ctx context.Context, mbID int) (*dto.AdminMemberDetail, error)
	Stats(ctx context.Context) (*dto.AdminStatsResponse, error)
}

type ReportService struct{ repo reportStore }

func NewReportService(repo reportStore) *ReportService { return &ReportService{repo: repo} }

func (s *ReportService) Dashboard(ctx context.Context, mbID int) (*dto.DashboardResponse, error) {
	return s.repo.Dashboard(ctx, mbID)
}

func (s *ReportService) MemberReport(ctx context.Context, mbID int, from, to time.Time) (*dto.MemberReportResponse, error) {
	return s.repo.MemberReport(ctx, mbID, from, to)
}

func (s *ReportService) AdminReport(ctx context.Context, reportType string, f ReportFilter) (*dto.AdminReportResponse, error) {
	return s.repo.AdminReport(ctx, reportType, f)
}

func (s *ReportService) ListMembers(ctx context.Context, f MemberListFilter, limit, offset int) ([]dto.AdminMemberSummary, int, error) {
	return s.repo.ListMembers(ctx, f, limit, offset)
}

func (s *ReportService) MemberDetail(ctx context.Context, mbID int) (*dto.AdminMemberDetail, error) {
	return s.repo.MemberDetail(ctx, mbID)
}

func (s *ReportService) Stats(ctx context.Context) (*dto.AdminStatsResponse, error) {
	return s.repo.Stats(ctx)
}
