package services

import (
	"context"
	"time"

	"soydee-api/internal/models"
)

type sleepRecordStore interface {
	ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailySleepRecord, error)
	FindByID(ctx context.Context, id int) (*models.DailySleepRecord, error)
	Create(ctx context.Context, s *models.DailySleepRecord) (int64, error)
	Update(ctx context.Context, s *models.DailySleepRecord) error
	Delete(ctx context.Context, id, mbID int) error
}

type SleepRecordService struct{ repo sleepRecordStore }

func NewSleepRecordService(repo sleepRecordStore) *SleepRecordService {
	return &SleepRecordService{repo: repo}
}

func (s *SleepRecordService) ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailySleepRecord, error) {
	return s.repo.ListByMemberAndDate(ctx, mbID, date)
}

func (s *SleepRecordService) FindByID(ctx context.Context, id int) (*models.DailySleepRecord, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *SleepRecordService) Create(ctx context.Context, r *models.DailySleepRecord) (int64, error) {
	return s.repo.Create(ctx, r)
}

func (s *SleepRecordService) Update(ctx context.Context, r *models.DailySleepRecord) error {
	return s.repo.Update(ctx, r)
}

func (s *SleepRecordService) Delete(ctx context.Context, id, mbID int) error {
	return s.repo.Delete(ctx, id, mbID)
}
