package utils

import (
	"encoding/json"
	"net/http"
)

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Message string      `json:"message"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Success bool        `json:"success"`
	Error   ErrorDetail `json:"error"`
}

func JSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func Success(w http.ResponseWriter, status int, data interface{}, message string) {
	JSON(w, status, SuccessResponse{Success: true, Data: data, Message: message})
}

func Error(w http.ResponseWriter, status int, code, message string) {
	JSON(w, status, ErrorResponse{
		Success: false,
		Error:   ErrorDetail{Code: code, Message: message},
	})
}

// Standard error codes shared across handlers (§1.4 of API_SPEC.md).
const (
	CodeValidationError     = "VALIDATION_ERROR"
	CodeInvalidCredentials  = "INVALID_CREDENTIALS"
	CodeTokenExpired        = "TOKEN_EXPIRED"
	CodeTokenInvalid        = "TOKEN_INVALID"
	CodeUnauthorized        = "UNAUTHORIZED"
	CodeForbidden           = "FORBIDDEN"
	CodeNotFound            = "NOT_FOUND"
	CodeDuplicateUsername   = "DUPLICATE_USERNAME"
	CodeConflict            = "CONFLICT"
	CodeDuplicateName       = "DUPLICATE_NAME"
	CodeUnprocessableEntity = "UNPROCESSABLE_ENTITY"
	CodeInternalError       = "INTERNAL_ERROR"
	CodeRateLimited         = "RATE_LIMITED"
)
