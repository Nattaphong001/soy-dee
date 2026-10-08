package services

import (
	"time"

	"soydee-api/internal/models"
	"soydee-api/pkg/utils"
)

type SleepEvalService struct{}

func NewSleepEvalService() *SleepEvalService {
	return &SleepEvalService{}
}

type SleepEvaluation struct {
	TotalHours float64
	EvalResult int
}

// Evaluate implements the dslp_eval_result logic (SOYDEE_AI_TASK.md §2.6):
// computed server-side from hours, never trust a client-supplied value.
// dslp_quality_score is the opposite — the user picks it, the system must
// never derive it from hours (that was the bug: both values used to be
// derived from the same thresholds, so they always agreed and one was
// redundant — see SleepRecordRequest.DslpQualityScore in dto/record_dto.go).
func (s *SleepEvalService) Evaluate(start, end time.Time) SleepEvaluation {
	hours := utils.Round2(end.Sub(start).Hours())

	var evalResult int
	switch {
	case hours < 7:
		evalResult = models.SleepEvalTooLittle
	case hours <= 9:
		evalResult = models.SleepEvalJustRight
	default:
		evalResult = models.SleepEvalTooMuch
	}

	return SleepEvaluation{TotalHours: hours, EvalResult: evalResult}
}
