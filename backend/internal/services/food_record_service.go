package services

import (
	"context"
	"time"

	"soydee-api/internal/models"
)

type foodRecordStore interface {
	ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailyFoodRecord, error)
	FindByID(ctx context.Context, id int) (*models.DailyFoodRecord, error)
	Create(ctx context.Context, f *models.DailyFoodRecord) (int64, error)
	Update(ctx context.Context, f *models.DailyFoodRecord) error
	Delete(ctx context.Context, id, mbID int) error
}

type FoodRecordService struct{ repo foodRecordStore }

func NewFoodRecordService(repo foodRecordStore) *FoodRecordService {
	return &FoodRecordService{repo: repo}
}

func (s *FoodRecordService) ListByMemberAndDate(ctx context.Context, mbID int, date time.Time) ([]models.DailyFoodRecord, error) {
	return s.repo.ListByMemberAndDate(ctx, mbID, date)
}

func (s *FoodRecordService) FindByID(ctx context.Context, id int) (*models.DailyFoodRecord, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *FoodRecordService) Create(ctx context.Context, f *models.DailyFoodRecord) (int64, error) {
	return s.repo.Create(ctx, f)
}

func (s *FoodRecordService) Update(ctx context.Context, f *models.DailyFoodRecord) error {
	return s.repo.Update(ctx, f)
}

func (s *FoodRecordService) Delete(ctx context.Context, id, mbID int) error {
	return s.repo.Delete(ctx, id, mbID)
}
