package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type contextKey string

const claimsContextKey contextKey = "claims"

// RequireAuth validates the Bearer access token on every request and stores
// the parsed claims in the request context for downstream handlers/guards.
func RequireAuth(authService *services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
				utils.Error(w, http.StatusUnauthorized, utils.CodeUnauthorized, "missing or malformed Authorization header")
				return
			}

			claims, err := authService.ParseToken(parts[1])
			switch {
			case errors.Is(err, services.ErrTokenExpired):
				utils.Error(w, http.StatusUnauthorized, utils.CodeTokenExpired, "token has expired")
				return
			case err != nil:
				utils.Error(w, http.StatusUnauthorized, utils.CodeTokenInvalid, "token is invalid")
				return
			}

			if claims.Type != "access" {
				utils.Error(w, http.StatusUnauthorized, utils.CodeTokenInvalid, "token is not an access token")
				return
			}

			ctx := context.WithValue(r.Context(), claimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromContext retrieves the authenticated user's claims. It must only
// be called downstream of RequireAuth.
func ClaimsFromContext(ctx context.Context) (*services.Claims, bool) {
	claims, ok := ctx.Value(claimsContextKey).(*services.Claims)
	return claims, ok
}
