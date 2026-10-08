package services

import (
	"context"

	"soydee-api/internal/models"
)

type systemStore interface {
	FindByID(ctx context.Context, sysID int) (*models.SystemData, error)
	UpdateProfile(ctx context.Context, sysID int, fullName, userName string) error
	UpdateAvatar(ctx context.Context, sysID int, path string) error
	UpdatePassword(ctx context.Context, sysID int, newHash string) error
}

type AdminProfileService struct{ repo systemStore }

func NewAdminProfileService(repo systemStore) *AdminProfileService {
	return &AdminProfileService{repo: repo}
}

func (s *AdminProfileService) FindByID(ctx context.Context, sysID int) (*models.SystemData, error) {
	return s.repo.FindByID(ctx, sysID)
}

func (s *AdminProfileService) UpdateProfile(ctx context.Context, sysID int, fullName, userName string) error {
	return s.repo.UpdateProfile(ctx, sysID, fullName, userName)
}

func (s *AdminProfileService) UpdateAvatar(ctx context.Context, sysID int, path string) error {
	return s.repo.UpdateAvatar(ctx, sysID, path)
}

func (s *AdminProfileService) UpdatePassword(ctx context.Context, sysID int, newHash string) error {
	return s.repo.UpdatePassword(ctx, sysID, newHash)
}
