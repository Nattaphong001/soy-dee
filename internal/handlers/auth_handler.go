package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"soydee-api/internal/dto"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) LoginMember(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	pair, member, err := h.authService.LoginMember(r.Context(), req.Username, req.Password)
	if errors.Is(err, services.ErrInvalidCredentials) {
		utils.Error(w, http.StatusUnauthorized, utils.CodeInvalidCredentials, "invalid username or password")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to login")
		return
	}

	utils.Success(w, http.StatusOK, dto.MemberLoginResponse{
		Token:        pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		ExpiresIn:    pair.ExpiresIn,
		Member: dto.MemberSummary{
			MbID:         member.MbID,
			MbUserName:   member.MbUserName,
			MbFullName:   member.MbFullName,
			MbGender:     member.MbGender,
			MbProfilePic: member.MbProfilePic,
		},
	}, "เข้าสู่ระบบสำเร็จ")
}

func (h *AuthHandler) LoginAdmin(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	pair, admin, err := h.authService.LoginAdmin(r.Context(), req.SysUsername, req.SysPassword)
	if errors.Is(err, services.ErrInvalidCredentials) {
		utils.Error(w, http.StatusUnauthorized, utils.CodeInvalidCredentials, "invalid username or password")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to login")
		return
	}

	utils.Success(w, http.StatusOK, dto.AdminLoginResponse{
		Token:        pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		ExpiresIn:    pair.ExpiresIn,
		Admin: dto.AdminSummary{
			SysID:       admin.SysID,
			SysUsername: admin.SysUsername,
		},
	}, "เข้าสู่ระบบสำเร็จ")
}

// Logout is intentionally stateless: Datasic.sql has no token-blacklist
// table, so the server just acknowledges and the client discards the token
// (API_SPEC.md §3.3 allows "and/or blacklist server-side").
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	utils.Success(w, http.StatusOK, nil, "ออกจากระบบสำเร็จ")
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req dto.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	pair, err := h.authService.Refresh(req.RefreshToken)
	switch {
	case errors.Is(err, services.ErrTokenExpired):
		utils.Error(w, http.StatusUnauthorized, utils.CodeTokenExpired, "refresh token has expired")
		return
	case errors.Is(err, services.ErrTokenInvalid):
		utils.Error(w, http.StatusUnauthorized, utils.CodeTokenInvalid, "refresh token is invalid")
		return
	case err != nil:
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to refresh token")
		return
	}

	utils.Success(w, http.StatusOK, dto.RefreshResponse{
		Token:     pair.AccessToken,
		ExpiresIn: pair.ExpiresIn,
	}, "ต่ออายุ token สำเร็จ")
}
