package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"soydee-api/internal/config"
	"soydee-api/internal/database"
	"soydee-api/internal/handlers"
	"soydee-api/internal/logger"
	"soydee-api/internal/repositories"
	"soydee-api/internal/routes"
	"soydee-api/internal/services"
)

func main() {
	logFile, err := logger.Init("logs")
	if err != nil {
		log.Fatalf("❌ init logger: %v", err)
	}
	defer logFile.Close()

	log.Println("🐝 Soy-Dee API booting...")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ load config: %v", err)
	}
	log.Printf("🔧 config loaded (env=%s, port=%s)", cfg.AppEnv, cfg.AppPort)

	db, err := database.NewMySQLPool(cfg)
	if err != nil {
		log.Fatalf("❌ connect database: %v", err)
	}
	defer db.Close()
	log.Printf("🗄️  connected to database %s@%s:%s", cfg.DBName, cfg.DBHost, cfg.DBPort)

	memberRepo := repositories.NewMemberRepository(db)
	systemRepo := repositories.NewSystemRepository(db)
	foodRepo := repositories.NewFoodRepository(db)
	activityRepo := repositories.NewActivityRepository(db)
	bodyStatsRepo := repositories.NewBodyStatsRepository(db)
	bmrRepo := repositories.NewBmrRepository(db)
	foodRecordRepo := repositories.NewFoodRecordRepository(db)
	activityRecordRepo := repositories.NewActivityRecordRepository(db)
	sleepRepo := repositories.NewSleepRepository(db)
	sleepEvalService := services.NewSleepEvalService()

	authService := services.NewAuthService(cfg, memberRepo, systemRepo)
	bmrService := services.NewBMRService(memberRepo, bodyStatsRepo, bmrRepo)
	reportService := services.NewReportService(repositories.NewReportRepository(db, bodyStatsRepo, bmrRepo))

	masterImages := handlers.NewMasterImageStore("uploads")

	h := routes.Handlers{
		Auth:           handlers.NewAuthHandler(authService),
		FoodCategory:   handlers.NewFoodCategoryHandler(services.NewFoodCategoryService(foodRepo), masterImages),
		Activity:       handlers.NewActivityHandler(services.NewActivityMasterService(activityRepo), masterImages),
		Member:         handlers.NewMemberHandler(services.NewMemberService(memberRepo, systemRepo), "uploads/avatars"),
		BMR:            handlers.NewBMRHandler(bmrService),
		BodyStats:      handlers.NewBodyStatsHandler(services.NewBodyStatsService(bodyStatsRepo, memberRepo)),
		FoodRecord:     handlers.NewFoodRecordHandler(services.NewFoodRecordService(foodRecordRepo), "uploads/food-images"),
		ActivityRecord: handlers.NewActivityRecordHandler(services.NewActivityRecordService(activityRecordRepo, activityRepo)),
		SleepRecord:    handlers.NewSleepRecordHandler(services.NewSleepRecordService(sleepRepo), sleepEvalService),
		Dashboard:      handlers.NewDashboardHandler(reportService),
		AdminReport:    handlers.NewAdminReportHandler(reportService),
		AdminProfile:   handlers.NewAdminProfileHandler(services.NewAdminProfileService(systemRepo), "uploads/avatars"),
	}

	router := routes.NewRouter(cfg, authService, h)

	addr := ":" + cfg.AppPort
	log.Printf("🚀 soydee-api listening on %s (env=%s) — watching every route below", addr, cfg.AppEnv)
	log.Println("──────────────────────────────────────────────")
	srv := &http.Server{
		Addr:              addr,
		Handler:           withHealth(db, router),
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("❌ server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("🛑 shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("⚠️  graceful shutdown failed: %v", err)
	}
}

// withHealth serves GET /healthz (liveness + DB ping) outside the /api/v1 tree.
func withHealth(db *sql.DB, next http.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := db.PingContext(ctx); err != nil {
			http.Error(w, "db unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.Handle("/", next)
	return mux
}
