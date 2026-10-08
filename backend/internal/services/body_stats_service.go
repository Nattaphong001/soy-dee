package services

import (
	"context"
	"time"

	"soydee-api/internal/models"
)

type bodyStatsStore interface {
	CreateWithBmr(ctx context.Context, bs *models.MemberBodyStats, gender int, birthDate time.Time) (int64, *models.MemberBmrHistory, error)
	ListByMember(ctx context.Context, mbID int) ([]models.MemberBodyStats, error)
	LatestByMember(ctx context.Context, mbID int) (*models.MemberBodyStats, error)
}

type memberFinder interface {
	FindByID(ctx context.Context, id int) (*models.MemberProfile, error)
}

type BodyStatsService struct {
	repo    bodyStatsStore
	members memberFinder
}

func NewBodyStatsService(repo bodyStatsStore, members memberFinder) *BodyStatsService {
	return &BodyStatsService{repo: repo, members: members}
}

func (s *BodyStatsService) FindMember(ctx context.Context, mbID int) (*models.MemberProfile, error) {
	return s.members.FindByID(ctx, mbID)
}

func (s *BodyStatsService) CreateWithBmr(ctx context.Context, bs *models.MemberBodyStats, gender int, birthDate time.Time) (int64, *models.MemberBmrHistory, error) {
	return s.repo.CreateWithBmr(ctx, bs, gender, birthDate)
}

func (s *BodyStatsService) ListByMember(ctx context.Context, mbID int) ([]models.MemberBodyStats, error) {
	return s.repo.ListByMember(ctx, mbID)
}

func (s *BodyStatsService) LatestByMember(ctx context.Context, mbID int) (*models.MemberBodyStats, error) {
	return s.repo.LatestByMember(ctx, mbID)
}
