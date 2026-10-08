// Package middleware: fixed-window per-IP rate limiter for unauthenticated
// endpoints (login/register) where brute-force is the main threat. In-memory
// only — fine for a single-instance deployment; a multi-instance deployment
// would need a shared store (Redis) instead.
package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"soydee-api/pkg/utils"
)

type rateLimiter struct {
	mu     sync.Mutex
	hits   map[string]*bucket
	limit  int
	window time.Duration
}

type bucket struct {
	count     int
	windowEnd time.Time
}

// RateLimit allows `limit` requests per `window` per client IP. Intended for
// low-traffic, high-abuse-risk routes (auth endpoints).
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	rl := &rateLimiter{
		hits:   make(map[string]*bucket),
		limit:  limit,
		window: window,
	}

	// Periodically drop expired buckets so the map doesn't grow forever.
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		for range ticker.C {
			now := time.Now()
			rl.mu.Lock()
			for ip, b := range rl.hits {
				if now.After(b.windowEnd) {
					delete(rl.hits, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := clientIP(r)

			rl.mu.Lock()
			now := time.Now()
			b, ok := rl.hits[ip]
			if !ok || now.After(b.windowEnd) {
				b = &bucket{count: 0, windowEnd: now.Add(window)}
				rl.hits[ip] = b
			}
			b.count++
			blocked := b.count > limit
			rl.mu.Unlock()

			if blocked {
				utils.Error(w, http.StatusTooManyRequests, utils.CodeRateLimited, "too many requests, try again later")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	// chi's RealIP middleware (mounted before this one) already rewrites
	// r.RemoteAddr from X-Forwarded-For/X-Real-IP when behind a proxy.
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
