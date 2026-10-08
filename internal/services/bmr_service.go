package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"soydee-api/internal/domain"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
)

// ErrIncompleteBodyData covers every precondition failure for BMR
// calculation (missing body stats row, missing weight/height/activity
// level/target, or missing gender/birth date on the profile) — all mapped
// to 422 Unprocessable Entity per API_SPEC.md §6.1.
var ErrIncompleteBodyData = errors.New("insufficient data to calculate BMR")

type BMRService struct {
	memberRepo    *repositories.MemberRepository
	bodyStatsRepo *repositories.BodyStatsRepository
	bmrRepo       *repositories.BmrRepository
}

func NewBMRService(memberRepo *repositories.MemberRepository, bodyStatsRepo *repositories.BodyStatsRepository, bmrRepo *repositories.BmrRepository) *BMRService {
	return &BMRService{memberRepo: memberRepo, bodyStatsRepo: bodyStatsRepo, bmrRepo: bmrRepo}
}

// Calculate implements the Mifflin-St Jeor formula described in
// API_SPEC.md §6.1: BMI -> eval result, BMR by gender, TDEE = BMR *
// activity_level, and a target-adjusted TDEE.
func (s *BMRService) Calculate(ctx context.Context, mbID int, mbsID *int, recordDate time.Time) (*models.MemberBmrHistory, error) {
	member, err := s.memberRepo.FindByID(ctx, mbID)
	if errors.Is(err, repositories.ErrNotFound) {
		return nil, repositories.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find member: %w", err)
	}
	if member.MbGender == nil || member.MbBirthDate == nil {
		return nil, ErrIncompleteBodyData
	}

	var bs *models.MemberBodyStats
	if mbsID != nil {
		bs, err = s.bodyStatsRepo.FindByID(ctx, *mbsID)
		if errors.Is(err, repositories.ErrNotFound) || (err == nil && bs.MbID != mbID) {
			return nil, ErrIncompleteBodyData
		}
	} else {
		bs, err = s.bodyStatsRepo.LatestByMember(ctx, mbID)
		if errors.Is(err, repositories.ErrNotFound) {
			return nil, ErrIncompleteBodyData
		}
	}
	if err != nil {
		return nil, fmt.Errorf("find body stats: %w", err)
	}
	if bs.MbsWeight == nil || bs.MbsHeight == nil || bs.MbsActivityLevel == nil || bs.MbsTarget == nil {
		return nil, ErrIncompleteBodyData
	}

	result := domain.ComputeBMR(*member.MbGender, *member.MbBirthDate, recordDate,
		*bs.MbsWeight, *bs.MbsHeight, *bs.MbsActivityLevel, *bs.MbsTarget)

	history := &models.MemberBmrHistory{
		MbhRecordDate: recordDate,
		MbhBMI:        &result.BMI,
		MbhEvalResult: &result.EvalResult,
		MbhBMR:        &result.BMR,
		MbhTDEE:       &result.TDEE,
		MbhTDEETarget: &result.TDEETarget,
		MbID:          mbID,
		MbsID:         bs.MbsID,
	}

	id, err := s.bmrRepo.Create(ctx, history)
	if err != nil {
		return nil, fmt.Errorf("save bmr history: %w", err)
	}
	history.MbhID = int(id)

	return history, nil
}

func (s *BMRService) ListByMember(ctx context.Context, mbID int, from, to *time.Time, limit, offset int) ([]models.MemberBmrHistory, int, error) {
	return s.bmrRepo.ListByMember(ctx, mbID, from, to, limit, offset)
}

func (s *BMRService) LatestByMember(ctx context.Context, mbID int) (*models.MemberBmrHistory, error) {
	return s.bmrRepo.LatestByMember(ctx, mbID)
}
