package services

import (
	"testing"
	"time"

	"soydee-api/internal/models"
)

func TestSleepEvaluate(t *testing.T) {
	start := time.Date(2026, 1, 1, 22, 0, 0, 0, time.UTC)
	cases := []struct {
		name      string
		duration  time.Duration
		wantHours float64
		wantEval  int
	}{
		{"under 7h", 6*time.Hour + 59*time.Minute, 6.98, models.SleepEvalTooLittle},
		{"exactly 7h", 7 * time.Hour, 7, models.SleepEvalJustRight},
		{"exactly 9h", 9 * time.Hour, 9, models.SleepEvalJustRight},
		{"over 9h", 9*time.Hour + 30*time.Minute, 9.5, models.SleepEvalTooMuch},
	}
	svc := NewSleepEvalService()
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := svc.Evaluate(start, start.Add(c.duration))
			if got.TotalHours != c.wantHours || got.EvalResult != c.wantEval {
				t.Fatalf("got %+v, want hours=%v eval=%v", got, c.wantHours, c.wantEval)
			}
		})
	}
}
