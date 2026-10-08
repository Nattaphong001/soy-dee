package dto

import (
	"testing"
	"time"
)

func TestSleepRecordRequestValidate_Future(t *testing.T) {
	q := 3
	now := time.Now()
	day := func(d time.Time) string { return d.Format("2006-01-02") }
	req := func(date string, start, end time.Time) SleepRecordRequest {
		return SleepRecordRequest{
			DslpDate:         date,
			DslpStartTime:    start.UTC().Format(time.RFC3339),
			DslpEndTime:      end.UTC().Format(time.RFC3339),
			DslpQualityScore: &q,
		}
	}

	cases := []struct {
		name string
		r    SleepRecordRequest
		ok   bool
	}{
		{"finished night", req(day(now), now.Add(-9*time.Hour), now.Add(-1*time.Hour)), true},
		{"past night", req(day(now.AddDate(0, 0, -5)), now.AddDate(0, 0, -5).Add(-8*time.Hour), now.AddDate(0, 0, -5)), true},
		{"wake-up not reached yet", req(day(now), now.Add(-2*time.Hour), now.Add(3*time.Hour)), false},
		{"future date", req(day(now.AddDate(0, 0, 3)), now.AddDate(0, 0, 3).Add(-8*time.Hour), now.AddDate(0, 0, 3)), false},
	}
	for _, c := range cases {
		if got := c.r.Validate().Valid(); got != c.ok {
			t.Errorf("%s: valid=%v, want %v", c.name, got, c.ok)
		}
	}
}
