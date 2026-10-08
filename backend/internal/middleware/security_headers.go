package middleware

import (
	"net/http"

	"soydee-api/internal/config"
)

// SecurityHeaders sets baseline hardening headers. HSTS is only sent in
// production: the API is expected to run behind a TLS-terminating reverse
// proxy there, and HSTS on a plain-HTTP local dev server would be actively
// wrong (browsers would remember and force HTTPS on localhost).
func SecurityHeaders(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			if cfg.AppEnv == "production" {
				h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
}
