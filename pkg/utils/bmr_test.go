package utils

import (
	"testing"
	"time"
)

func date(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

// Regression test for the mb_id=3 / mbh_id=2 bug documented in
// SOYDEE_AI_TASK.md §3: birth date 2004-10-25 evaluated on 2026-08-10 was
// computed as age 28 instead of 21 (birthday not yet reached this year).
func TestAgeAt(t *testing.T) {
	cases := []struct {
		name      string
		birthDate time.Time
		at        time.Time
		want      int
	}{
		{"birthday not yet reached this year", date(2004, time.October, 25), date(2026, time.August, 10), 21},
		{"birthday already passed this year", date(2004, time.October, 25), date(2026, time.November, 1), 22},
		{"exact birthday", date(2004, time.October, 25), date(2026, time.October, 25), 22},
		{"day before birthday", date(2004, time.October, 25), date(2026, time.October, 24), 21},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := AgeAt(c.birthDate, c.at); got != c.want {
				t.Errorf("AgeAt(%v, %v) = %d, want %d", c.birthDate, c.at, got, c.want)
			}
		})
	}
}

// bmiEvalResult boundaries must use "<" on the upper edge per §2.4 — this
// guards against the off-by-one gap bug found in the frontend's
// bmiToGaugeAngle() (<=22.9 / <=24.9 leaves 22.95 and 24.95 unclassified).
func TestBmiEvalResultBoundaries(t *testing.T) {
	cases := []struct {
		bmi  float64
		want int
	}{
		{17.0, BMIEvalUnderweight},
		{18.4, BMIEvalUnderweight},
		{18.5, BMIEvalNormal},
		{22.9, BMIEvalNormal},
		{22.95, BMIEvalNormal},
		{23.0, BMIEvalOverweight},
		{24.9, BMIEvalOverweight},
		{24.95, BMIEvalOverweight},
		{25.0, BMIEvalObese},
		{32.0, BMIEvalObese},
	}
	for _, c := range cases {
		if got := bmiEvalResult(c.bmi); got != c.want {
			t.Errorf("bmiEvalResult(%v) = %d, want %d", c.bmi, got, c.want)
		}
	}
}

// mbh_id=2 regression: age 21 (not 28) must yield BMR 1645.00 and TDEE
// 1645*1.55=2549.75, matching the value migration_fix.sql B9 corrected the
// database to (verified against A4 in PART A of the migration).
func TestComputeBMR_AgeRegression(t *testing.T) {
	got := ComputeBMR(1, date(2004, time.October, 25), date(2026, time.August, 10), 67, 172, 1.55, 3)
	if got.BMR != 1645.00 {
		t.Errorf("BMR = %v, want 1645.00", got.BMR)
	}
	if got.TDEE != 2549.75 {
		t.Errorf("TDEE = %v, want 2549.75", got.TDEE)
	}
	if got.TDEETarget != 2549.75 {
		t.Errorf("TDEETarget (maintain) = %v, want 2549.75", got.TDEETarget)
	}
}

// target=1 (lose weight) had zero coverage in both the database and the
// test suite before this — SOYDEE_AI_TASK.md §3 flags it explicitly as an
// untested case that must be covered before signoff.
func TestComputeBMR_TargetLoseWeight(t *testing.T) {
	got := ComputeBMR(2, date(1995, time.January, 1), date(2026, time.January, 1), 60, 160, 1.375, 1)
	wantBMR := 10*60.0 + 6.25*160 - 5*31 - 161
	if got.BMR != Round2(wantBMR) {
		t.Fatalf("BMR = %v, want %v", got.BMR, Round2(wantBMR))
	}
	wantTDEE := Round2(got.BMR * 1.375)
	if got.TDEE != wantTDEE {
		t.Fatalf("TDEE = %v, want %v", got.TDEE, wantTDEE)
	}
	wantTarget := Round2(wantTDEE * 0.85)
	if got.TDEETarget != wantTarget {
		t.Errorf("TDEETarget (lose weight) = %v, want %v", got.TDEETarget, wantTarget)
	}
}

// The lose-weight target must never be floored below BMR even for a very
// sedentary activity level, where TDEE*0.80 could dip under BMR.
func TestComputeBMR_TargetLoseWeight_FloorAtBMR(t *testing.T) {
	got := ComputeBMR(1, date(1990, time.June, 15), date(2026, time.June, 15), 50, 150, 1.0, 1)
	if got.TDEETarget < got.BMR {
		t.Errorf("TDEETarget %v fell below BMR %v", got.TDEETarget, got.BMR)
	}
}

func TestComputeBMR_TargetGainMuscle(t *testing.T) {
	got := ComputeBMR(1, date(2000, time.March, 3), date(2026, time.March, 3), 70, 175, 1.55, 2)
	want := Round2(got.TDEE * 1.15)
	if got.TDEETarget != want {
		t.Errorf("TDEETarget (gain muscle) = %v, want %v", got.TDEETarget, want)
	}
}
