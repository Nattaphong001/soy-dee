package services

import (
	"context"

	"soydee-api/internal/models"
)

type memberStore interface {
	FindByID(ctx context.Context, id int) (*models.MemberProfile, error)
	UsernameExists(ctx context.Context, username string) (bool, error)
	CreateWithBodyStats(ctx context.Context, m *models.MemberProfile, bs *models.MemberBodyStats) (int64, error)
	UpdateProfile(ctx context.Context, m *models.MemberProfile) error
	UpdatePassword(ctx context.Context, mbID int, newHash string) error
	UpdateAvatar(ctx context.Context, mbID int, path string) error
}

type adminUsernameStore interface {
	UsernameExists(ctx context.Context, username string) (bool, error)
}

type MemberService struct {
	repo   memberStore
	system adminUsernameStore
}

func NewMemberService(repo memberStore, system adminUsernameStore) *MemberService {
	return &MemberService{repo: repo, system: system}
}

// UsernameTaken reports whether a username is used by a member or an admin —
// the two namespaces must never collide.
func (s *MemberService) UsernameTaken(ctx context.Context, username string) (bool, error) {
	exists, err := s.repo.UsernameExists(ctx, username)
	if err != nil || exists {
		return exists, err
	}
	return s.system.UsernameExists(ctx, username)
}

func (s *MemberService) FindByID(ctx context.Context, id int) (*models.MemberProfile, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *MemberService) CreateWithBodyStats(ctx context.Context, m *models.MemberProfile, bs *models.MemberBodyStats) (int64, error) {
	return s.repo.CreateWithBodyStats(ctx, m, bs)
}

func (s *MemberService) UpdateProfile(ctx context.Context, m *models.MemberProfile) error {
	return s.repo.UpdateProfile(ctx, m)
}

func (s *MemberService) UpdatePassword(ctx context.Context, mbID int, newHash string) error {
	return s.repo.UpdatePassword(ctx, mbID, newHash)
}

func (s *MemberService) UpdateAvatar(ctx context.Context, mbID int, path string) error {
	return s.repo.UpdateAvatar(ctx, mbID, path)
}
