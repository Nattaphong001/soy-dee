package services

import (
	"context"
	"time"

	"soydee-api/internal/models"
)

type activityRecordStore interface {
	ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailyActivityRecord, error)
	FindByID(ctx context.Context, id int) (*models.DailyActivityRecord, error)
	Create(ctx context.Context, a *models.DailyActivityRecord) (int64, error)
	Update(ctx context.Context, a *models.DailyActivityRecord) error
	Delete(ctx context.Context, id, mbID int) error
}

type activityLookup interface {
	FindByID(ctx context.Context, id int) (*models.ActivityMaster, error)
}

type ActivityRecordService struct {
	repo       activityRecordStore
	activities activityLookup
}

func NewActivityRecordService(repo activityRecordStore, activities activityLookup) *ActivityRecordService {
	return &ActivityRecordService{repo: repo, activities: activities}
}

func (s *ActivityRecordService) ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailyActivityRecord, error) {
	return s.repo.ListByMemberAndDate(ctx, mbID, date)
}

func (s *ActivityRecordService) FindByID(ctx context.Context, id int) (*models.DailyActivityRecord, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *ActivityRecordService) Create(ctx context.Context, a *models.DailyActivityRecord) (int64, error) {
	return s.repo.Create(ctx, a)
}

func (s *ActivityRecordService) Update(ctx context.Context, a *models.DailyActivityRecord) error {
	return s.repo.Update(ctx, a)
}

func (s *ActivityRecordService) Delete(ctx context.Context, id, mbID int) error {
	return s.repo.Delete(ctx, id, mbID)
}

// FindActivity looks up the master activity a record refers to.
func (s *ActivityRecordService) FindActivity(ctx context.Context, id int) (*models.ActivityMaster, error) {
	return s.activities.FindByID(ctx, id)
}
