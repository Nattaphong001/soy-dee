package routes

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"soydee-api/internal/config"
	"soydee-api/internal/handlers"
	"soydee-api/internal/logger"
	appmw "soydee-api/internal/middleware"
	"soydee-api/internal/services"
)

// Handlers bundles every module's HTTP handler. Fields are filled in as
// each module (§2 of API_SPEC.md) is implemented; nil fields are simply not
// mounted yet.
type Handlers struct {
	Auth           *handlers.AuthHandler
	FoodCategory   *handlers.FoodCategoryHandler
	Activity       *handlers.ActivityHandler
	Member         *handlers.MemberHandler
	BMR            *handlers.BMRHandler
	BodyStats      *handlers.BodyStatsHandler
	FoodRecord     *handlers.FoodRecordHandler
	ActivityRecord *handlers.ActivityRecordHandler
	SleepRecord    *handlers.SleepRecordHandler
	Dashboard      *handlers.DashboardHandler
	AdminReport    *handlers.AdminReportHandler
	AdminProfile   *handlers.AdminProfileHandler
}

func NewRouter(cfg *config.Config, authService *services.AuthService, h Handlers) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(logger.RequestLogger())
	r.Use(chimw.Recoverer)
	r.Use(appmw.SecurityHeaders(cfg))
	r.Use(appmw.CORS(cfg))

	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	r.Route("/api/v1", func(api chi.Router) {
		api.Route("/auth", func(auth chi.Router) {
			// Brute-force protection: 10 attempts/min per IP on the
			// unauthenticated credential-guessing surface.
			auth.Group(func(limited chi.Router) {
				limited.Use(appmw.RateLimit(10, time.Minute))
				limited.Post("/login/member", h.Auth.LoginMember)
				limited.Post("/login/admin", h.Auth.LoginAdmin)
				limited.Post("/refresh", h.Auth.Refresh)
				limited.Post("/register", h.Member.Register)
			})

			auth.Group(func(protected chi.Router) {
				protected.Use(appmw.RequireAuth(authService))
				protected.Post("/logout", h.Auth.Logout)
			})
		})

		// Any authenticated user (member or admin) — read-only dropdown data.
		api.Group(func(authed chi.Router) {
			authed.Use(appmw.RequireAuth(authService))

			authed.Get("/food-categories", h.FoodCategory.List)
			authed.Get("/activities", h.Activity.List)
		})

		// Admin-only master data management (API_SPEC.md §5).
		api.Route("/admin", func(admin chi.Router) {
			admin.Use(appmw.RequireAuth(authService))
			admin.Use(appmw.RequireRole(services.RoleAdmin))

			admin.Route("/food-categories", func(fc chi.Router) {
				fc.Get("/", h.FoodCategory.List)
				fc.Post("/", h.FoodCategory.Create)
				fc.Post("/image", h.FoodCategory.UploadImage)
				fc.Get("/{id}", h.FoodCategory.Get)
				fc.Put("/{id}", h.FoodCategory.Update)
				fc.Delete("/{id}", h.FoodCategory.Delete)
			})

			admin.Route("/activities", func(act chi.Router) {
				act.Get("/", h.Activity.List)
				act.Post("/", h.Activity.Create)
				act.Post("/image", h.Activity.UploadImage)
				act.Get("/{id}", h.Activity.Get)
				act.Put("/{id}", h.Activity.Update)
				act.Delete("/{id}", h.Activity.Delete)
			})

			admin.Get("/reports", h.AdminReport.Reports)
			admin.Get("/stats", h.AdminReport.Stats)

			admin.Get("/profile", h.AdminProfile.GetProfile)
			admin.Put("/profile", h.AdminProfile.UpdateProfile)
			admin.Post("/avatar", h.AdminProfile.UploadAvatar)
			admin.Put("/password", h.AdminProfile.ChangePassword)

			admin.Route("/members", func(mem chi.Router) {
				mem.Get("/", h.AdminReport.ListMembers)
				mem.Get("/{id}", h.AdminReport.MemberDetail)
			})
		})

		// Per-member resources: {id} must match the caller's own mb_id
		// unless the caller is an admin (API_SPEC.md §12 rule 1).
		api.Route("/members/{id}", func(m chi.Router) {
			m.Use(appmw.RequireAuth(authService))
			m.Use(appmw.RequireOwnerOrAdmin)

			m.Get("/profile", h.Member.GetProfile)
			m.Put("/profile", h.Member.UpdateProfile)
			m.Patch("/password", h.Member.ChangePassword)
			m.Post("/avatar", h.Member.UploadAvatar)

			m.Post("/bmr/calculate", h.BMR.Calculate)
			m.Get("/bmr/history", h.BMR.History)
			m.Get("/bmr/latest", h.BMR.Latest)

			m.Get("/body-stats", h.BodyStats.List)
			m.Post("/body-stats", h.BodyStats.Create)
			m.Get("/body-stats/latest", h.BodyStats.Latest)

			m.Post("/food-images", h.FoodRecord.UploadImage)
			m.Get("/food-records", h.FoodRecord.List)
			m.Post("/food-records", h.FoodRecord.Create)
			m.Get("/food-records/{dfd_id}", h.FoodRecord.Get)
			m.Put("/food-records/{dfd_id}", h.FoodRecord.Update)
			m.Delete("/food-records/{dfd_id}", h.FoodRecord.Delete)

			m.Get("/activity-records", h.ActivityRecord.List)
			m.Post("/activity-records", h.ActivityRecord.Create)
			m.Get("/activity-records/{dact_id}", h.ActivityRecord.Get)
			m.Put("/activity-records/{dact_id}", h.ActivityRecord.Update)
			m.Delete("/activity-records/{dact_id}", h.ActivityRecord.Delete)

			m.Get("/sleep-records", h.SleepRecord.List)
			m.Post("/sleep-records", h.SleepRecord.Create)
			m.Get("/sleep-records/{dslp_id}", h.SleepRecord.Get)
			m.Put("/sleep-records/{dslp_id}", h.SleepRecord.Update)
			m.Delete("/sleep-records/{dslp_id}", h.SleepRecord.Delete)

			m.Get("/dashboard", h.Dashboard.Get)
			m.Get("/report", h.Dashboard.Report)
		})
	})

	return r
}
