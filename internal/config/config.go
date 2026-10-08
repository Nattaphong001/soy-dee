package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	AppPort string

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	JWTSecret          string
	JWTAccessTTL       time.Duration
	JWTRefreshTTL      time.Duration
	CORSAllowedOrigins []string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	accessTTLMin, err := strconv.Atoi(getEnv("JWT_ACCESS_TTL_MINUTES", "60"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_ACCESS_TTL_MINUTES: %w", err)
	}
	refreshTTLHours, err := strconv.Atoi(getEnv("JWT_REFRESH_TTL_HOURS", "168"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_REFRESH_TTL_HOURS: %w", err)
	}

	secret := getEnv("JWT_SECRET", "")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET must be set")
	}

	origins := strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "*"), ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	appEnv := getEnv("APP_ENV", "development")
	if appEnv == "production" {
		for _, o := range origins {
			if o == "*" {
				return nil, fmt.Errorf("CORS_ALLOWED_ORIGINS must not be \"*\" in production")
			}
		}
	}

	cfg := &Config{
		AppEnv:  appEnv,
		AppPort: getEnv("APP_PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "127.0.0.1"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "soydee"),

		JWTSecret:          secret,
		JWTAccessTTL:       time.Duration(accessTTLMin) * time.Minute,
		JWTRefreshTTL:      time.Duration(refreshTTLHours) * time.Hour,
		CORSAllowedOrigins: origins,
	}

	return cfg, nil
}

func (c *Config) MySQLDSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&loc=Local&clientFoundRows=true",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
