package domain

import (
	"time"

	"soydee-api/pkg/utils"
)

// BMI evaluation enum values — mirrors models.BMIEval* (kept independent
// here so this package has no internal/* imports).
const (
	BMIEvalUnderweight = 1
	BMIEvalNormal      = 2
	BMIEvalOverweight  = 3
	BMIEvalObese       = 4
)

// BMRResult holds one Mifflin-St Jeor calculation (API_SPEC.md §6.1).
type BMRResult struct {
	BMI        float64
	EvalResult int
	BMR        float64
	TDEE       float64
	TDEETarget float64
}

// ComputeBMR runs the BMI -> eval result, BMR, TDEE, target-adjusted TDEE
// pipeline. gender is models.GenderMale/GenderFemale (1/2), target is
// models.TargetLoseWeight/GainMuscle/Maintain (1/2/3) — passed as raw ints
// so this package stays free of internal/* imports.
func ComputeBMR(gender int, birthDate, recordDate time.Time, weightKg, heightCM, activityLevel float64, target int) BMRResult {
	age := AgeAt(birthDate, recordDate)
	heightM := heightCM / 100

	bmi := utils.Round2(weightKg / (heightM * heightM))

	var bmr float64
	if gender == 1 {
		bmr = 10*weightKg + 6.25*heightCM - 5*float64(age) + 5
	} else {
		bmr = 10*weightKg + 6.25*heightCM - 5*float64(age) - 161
	}
	bmr = utils.Round2(bmr)

	tdee := utils.Round2(bmr * activityLevel)

	var tdeeTarget float64
	switch target {
	case 1: // lose weight — SOYDEE_AI_TASK.md §3 formula: TDEE × 0.85
		tdeeTarget = tdee * 0.85
		if tdeeTarget < bmr {
			tdeeTarget = bmr // safety floor: never diet below BMR
		}
	case 2: // gain muscle
		tdeeTarget = tdee + tdee*0.15
	default: // maintain
		tdeeTarget = tdee
	}
	tdeeTarget = utils.Round2(tdeeTarget)

	return BMRResult{
		BMI:        bmi,
		EvalResult: bmiEvalResult(bmi),
		BMR:        bmr,
		TDEE:       tdee,
		TDEETarget: tdeeTarget,
	}
}

// AgeAt returns the whole number of years elapsed from birthDate to at,
// accounting for whether the birthday has occurred yet in the "at" year.
func AgeAt(birthDate, at time.Time) int {
	age := at.Year() - birthDate.Year()
	hadBirthdayThisYear := at.Month() > birthDate.Month() ||
		(at.Month() == birthDate.Month() && at.Day() >= birthDate.Day())
	if !hadBirthdayThisYear {
		age--
	}
	return age
}

func bmiEvalResult(bmi float64) int {
	switch {
	case bmi < 18.5:
		return BMIEvalUnderweight
	case bmi < 23:
		return BMIEvalNormal
	case bmi < 25:
		return BMIEvalOverweight
	default:
		return BMIEvalObese
	}
}
