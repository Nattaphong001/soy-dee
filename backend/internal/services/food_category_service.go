package services

import (
	"context"

	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
)

type foodCategoryStore interface {
	List(ctx context.Context, trafficLight *int) ([]repositories.FoodCategoryWithUsage, error)
	FindByID(ctx context.Context, id int) (*models.FoodCategory, error)
	Create(ctx context.Context, f *models.FoodCategory) (int64, error)
	Update(ctx context.Context, f *models.FoodCategory) error
	Delete(ctx context.Context, id int) error
	NameExists(ctx context.Context, name string, excludeID int) (bool, error)
}

type FoodCategoryService struct{ repo foodCategoryStore }

func NewFoodCategoryService(repo foodCategoryStore) *FoodCategoryService {
	return &FoodCategoryService{repo: repo}
}

func (s *FoodCategoryService) List(ctx context.Context, trafficLight *int) ([]repositories.FoodCategoryWithUsage, error) {
	return s.repo.List(ctx, trafficLight)
}

func (s *FoodCategoryService) FindByID(ctx context.Context, id int) (*models.FoodCategory, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *FoodCategoryService) Create(ctx context.Context, f *models.FoodCategory) (int64, error) {
	return s.repo.Create(ctx, f)
}

func (s *FoodCategoryService) Update(ctx context.Context, f *models.FoodCategory) error {
	return s.repo.Update(ctx, f)
}

func (s *FoodCategoryService) Delete(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}

func (s *FoodCategoryService) NameExists(ctx context.Context, name string, excludeID int) (bool, error) {
	return s.repo.NameExists(ctx, name, excludeID)
}
