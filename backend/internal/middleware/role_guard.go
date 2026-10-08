package middleware

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

// RequireRole restricts a route to a single JWT role (e.g. "admin"),
// per API_SPEC.md §12 rule 2. Must run downstream of RequireAuth.
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := ClaimsFromContext(r.Context())
			if !ok || claims.Role != role {
				utils.Error(w, http.StatusForbidden, utils.CodeForbidden, "you do not have permission to access this resource")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireOwnerOrAdmin enforces API_SPEC.md §12 rule 1: the {id} in
// /members/{id}/... must match the authenticated member's own mb_id, unless
// the caller is an admin. Must run downstream of RequireAuth and expects a
// chi URL param named "id".
func RequireOwnerOrAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := ClaimsFromContext(r.Context())
		if !ok {
			utils.Error(w, http.StatusUnauthorized, utils.CodeUnauthorized, "authentication required")
			return
		}

		if claims.Role == services.RoleAdmin {
			next.ServeHTTP(w, r)
			return
		}

		pathID, err := strconv.Atoi(chi.URLParam(r, "id"))
		if err != nil || pathID != claims.UserID {
			utils.Error(w, http.StatusForbidden, utils.CodeForbidden, "you may only access your own resources")
			return
		}

		next.ServeHTTP(w, r)
	})
}
