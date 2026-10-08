package services

import (
	"context"

	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
)

type activityMasterStore interface {
	List(ctx context.Context) ([]repositories.ActivityWithUsage, error)
	FindByID(ctx context.Context, id int) (*models.ActivityMaster, error)
	Create(ctx context.Context, a *models.ActivityMaster) (int64, error)
	Update(ctx context.Context, a *models.ActivityMaster) error
	Delete(ctx context.Context, id int) error
	NameExists(ctx context.Context, name string, excludeID int) (bool, error)
}

type ActivityMasterService struct{ repo activityMasterStore }

func NewActivityMasterService(repo activityMasterStore) *ActivityMasterService {
	return &ActivityMasterService{repo: repo}
}

func (s *ActivityMasterService) List(ctx context.Context) ([]repositories.ActivityWithUsage, error) {
	return s.repo.List(ctx)
}

func (s *ActivityMasterService) FindByID(ctx context.Context, id int) (*models.ActivityMaster, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *ActivityMasterService) Create(ctx context.Context, a *models.ActivityMaster) (int64, error) {
	return s.repo.Create(ctx, a)
}

func (s *ActivityMasterService) Update(ctx context.Context, a *models.ActivityMaster) error {
	return s.repo.Update(ctx, a)
}

func (s *ActivityMasterService) Delete(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}

func (s *ActivityMasterService) NameExists(ctx context.Context, name string, excludeID int) (bool, error) {
	return s.repo.NameExists(ctx, name, excludeID)
}
