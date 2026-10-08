package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"soydee-api/pkg/utils"
)

// urlParamInt reads a chi URL param and parses it as an int.
func urlParamInt(r *http.Request, name string) (int, error) {
	return strconv.Atoi(chi.URLParam(r, name))
}

// decodeJSON decodes the request body into dst.
func decodeJSON(r *http.Request, dst interface{}) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

// parsePagination reads ?page & ?limit per API_SPEC.md §1 (default
// limit=20, max 100) and returns (limit, offset, page).
func parsePagination(r *http.Request) (limit, offset, page int) {
	page = 1
	if raw := r.URL.Query().Get("page"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			page = v
		}
	}

	limit = 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			limit = v
		}
	}
	if limit > 100 {
		limit = 100
	}

	offset = (page - 1) * limit
	return limit, offset, page
}

// optionalIntQuery reads an optional integer query param, returning nil when
// absent/empty and an error when present but not a valid integer.
func optionalIntQuery(r *http.Request, name string) (*int, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return nil, nil
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// parseDateRange reads optional ?from=YYYY-MM-DD&to=YYYY-MM-DD query params.
func parseDateRange(r *http.Request) (from, to *time.Time, err error) {
	if raw := r.URL.Query().Get("from"); raw != "" {
		t, e := utils.ParseDate(raw)
		if e != nil {
			return nil, nil, e
		}
		from = &t
	}
	if raw := r.URL.Query().Get("to"); raw != "" {
		t, e := utils.ParseDate(raw)
		if e != nil {
			return nil, nil, e
		}
		to = &t
	}
	return from, to, nil
}
