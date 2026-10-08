package main

import (
	"log"
	"net/http"

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
	reportService := services.NewReportService(db, bodyStatsRepo, bmrRepo)

	masterImages := handlers.NewMasterImageStore("uploads")

	h := routes.Handlers{
		Auth:           handlers.NewAuthHandler(authService),
		FoodCategory:   handlers.NewFoodCategoryHandler(foodRepo, masterImages),
		Activity:       handlers.NewActivityHandler(activityRepo, masterImages),
		Member:         handlers.NewMemberHandler(memberRepo, systemRepo, "uploads/avatars"),
		BMR:            handlers.NewBMRHandler(bmrService, bmrRepo),
		BodyStats:      handlers.NewBodyStatsHandler(bodyStatsRepo, memberRepo),
		FoodRecord:     handlers.NewFoodRecordHandler(foodRecordRepo, "uploads/food-images"),
		ActivityRecord: handlers.NewActivityRecordHandler(activityRecordRepo, activityRepo),
		SleepRecord:    handlers.NewSleepRecordHandler(sleepRepo, sleepEvalService),
		Dashboard:      handlers.NewDashboardHandler(reportService),
		AdminReport:    handlers.NewAdminReportHandler(reportService),
		AdminProfile:   handlers.NewAdminProfileHandler(systemRepo, memberRepo, "uploads/avatars"),
	}

	router := routes.NewRouter(cfg, authService, h)

	addr := ":" + cfg.AppPort
	log.Printf("🚀 soydee-api listening on %s (env=%s) — watching every route below", addr, cfg.AppEnv)
	log.Println("──────────────────────────────────────────────")
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("❌ server error: %v", err)
	}
}
