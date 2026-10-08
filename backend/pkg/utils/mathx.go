package utils

import "math"

// Round2 rounds to 2 decimal places (half away from zero).
func Round2(v float64) float64 {
	return math.Round(v*100) / 100
}
