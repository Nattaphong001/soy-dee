// Package logger sets up application-wide logging: every log.Print/Fatal
// call (including chi's request logger) is mirrored to both stdout and a
// daily rotating file under ./logs, so runtime activity survives after the
// console window closes.
package logger

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
)

// methodEmoji picks a glanceable icon per HTTP method so a scrolling
// terminal log stays scannable without reading the method text.
func methodEmoji(method string) string {
	switch method {
	case http.MethodGet:
		return "📥"
	case http.MethodPost:
		return "📤"
	case http.MethodPut, http.MethodPatch:
		return "✏️"
	case http.MethodDelete:
		return "🗑️"
	default:
		return "📡"
	}
}

// statusEmoji buckets a response status into success/client-error/
// server-error/redirect so failures jump out visually.
func statusEmoji(status int) string {
	switch {
	case status >= 500:
		return "❌"
	case status >= 400:
		return "⚠️"
	case status >= 300:
		return "↪️"
	default:
		return "✅"
	}
}

// Init opens today's log file, mirrors the standard logger to stdout+file,
// and returns the file so the caller can defer its Close.
func Init(logDir string) (*os.File, error) {
	if logDir == "" {
		logDir = "logs"
	}
	if err := os.MkdirAll(logDir, 0o755); err != nil {
		return nil, fmt.Errorf("create log dir: %w", err)
	}

	fileName := filepath.Join(logDir, time.Now().Format("2006-01-02")+".log")
	file, err := os.OpenFile(fileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return nil, fmt.Errorf("open log file: %w", err)
	}

	log.SetOutput(io.MultiWriter(os.Stdout, file))
	log.SetFlags(log.LstdFlags)

	return file, nil
}

// RequestLogger is a chi middleware that logs every HTTP request (method,
// path, status, size, duration) through the same writer set up by Init, one
// emoji-tagged line per request so traffic across every route stays easy to
// scan at a glance.
func RequestLogger() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			status := ww.Status()
			if status == 0 {
				status = http.StatusOK
			}
			log.Printf("%s %d %s %-6s %s (%s, %d bytes)",
				statusEmoji(status), status, methodEmoji(r.Method), r.Method,
				r.URL.Path, time.Since(start).Round(time.Millisecond), ww.BytesWritten())
		})
	}
}
