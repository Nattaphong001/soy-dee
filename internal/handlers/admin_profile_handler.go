package handlers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"soydee-api/internal/dto"
	"soydee-api/internal/middleware"
	"soydee-api/internal/repositories"
	"soydee-api/pkg/utils"
)

// AdminProfileHandler covers GET/PUT /admin/profile, POST /admin/avatar and
// PUT /admin/password (SOYDEE_AI_TASK.md ข้อ 5). Unlike MemberHandler these
// routes carry no {id} URL param — the admin's own sys_id comes from the JWT
// claims set by RequireAuth (see middleware.ClaimsFromContext), same way
// RequireRole(admin) already gates the whole /admin group in router.go.
type AdminProfileHandler struct {
	repo       *repositories.SystemRepository
	memberRepo *repositories.MemberRepository
	avatarDir  string
}

func NewAdminProfileHandler(repo *repositories.SystemRepository, memberRepo *repositories.MemberRepository, avatarDir string) *AdminProfileHandler {
	return &AdminProfileHandler{repo: repo, memberRepo: memberRepo, avatarDir: avatarDir}
}

func adminSysID(r *http.Request) (int, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		return 0, false
	}
	return claims.UserID, true
}

func (h *AdminProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	sysID, ok := adminSysID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, utils.CodeUnauthorized, "authentication required")
		return
	}

	admin, err := h.repo.FindByID(r.Context(), sysID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "admin not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get profile")
		return
	}

	utils.Success(w, http.StatusOK, admin, "ดึงข้อมูลโปรไฟล์สำเร็จ")
}

func (h *AdminProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	sysID, ok := adminSysID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, utils.CodeUnauthorized, "authentication required")
		return
	}

	var req dto.AdminProfileUpdateRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	existing, err := h.repo.FindByID(r.Context(), sysID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "admin not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load profile")
		return
	}

	// Username is immutable after account creation — req.SysUsername is ignored
	// here even if the client sends a different value.
	if err := h.repo.UpdateProfile(r.Context(), sysID, req.SysFullName, existing.SysUsername); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update profile")
		return
	}

	existing.SysFullName = &req.SysFullName
	utils.Success(w, http.StatusOK, existing, "แก้ไขโปรไฟล์สำเร็จ")
}

func (h *AdminProfileHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	sysID, ok := adminSysID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, utils.CodeUnauthorized, "authentication required")
		return
	}

	var req dto.PasswordChangeRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	admin, err := h.repo.FindByID(r.Context(), sysID)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "admin not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load admin")
		return
	}

	if !utils.CheckPassword(req.CurrentPassword, admin.SysPassword) {
		utils.Error(w, http.StatusUnauthorized, utils.CodeInvalidCredentials, "current password is incorrect")
		return
	}

	hash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to hash password")
		return
	}

	if err := h.repo.UpdatePassword(r.Context(), sysID, hash); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update password")
		return
	}

	utils.Success(w, http.StatusOK, nil, "เปลี่ยนรหัสผ่านสำเร็จ")
}

func (h *AdminProfileHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	sysID, ok := adminSysID(r)
	if !ok {
		utils.Error(w, http.StatusUnauthorized, utils.CodeUnauthorized, "authentication required")
		return
	}

	if err := r.ParseMultipartForm(maxAvatarUploadBytes); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "avatar file is too large or malformed")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "avatar file is required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedAvatarExts[ext] {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "avatar must be jpg, jpeg, png, or webp")
		return
	}

	sniff := make([]byte, 512)
	n, err := io.ReadFull(file, sniff)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "failed to read avatar file")
		return
	}
	sniff = sniff[:n]
	if !allowedAvatarMimes[http.DetectContentType(sniff)] {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "avatar content is not a valid jpg, png, or webp image")
		return
	}

	if err := os.MkdirAll(h.avatarDir, 0o755); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to prepare upload directory")
		return
	}

	// "admin_" prefix: uploads/avatars is shared with member avatars, which
	// are named "{mb_id}{ext}" — without the prefix, an admin sys_id could
	// collide with a member's mb_id and overwrite their photo file.
	filename := fmt.Sprintf("admin_%d%s", sysID, ext)
	dest, err := os.Create(filepath.Join(h.avatarDir, filename))
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save avatar")
		return
	}
	defer dest.Close()

	if _, err := dest.Write(sniff); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save avatar")
		return
	}
	if _, err := io.Copy(dest, file); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save avatar")
		return
	}

	urlPath := "/uploads/avatars/" + filename
	if err := h.repo.UpdateAvatar(r.Context(), sysID, urlPath); errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "admin not found")
		return
	} else if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save avatar")
		return
	}

	utils.Success(w, http.StatusOK, map[string]string{"sys_avatar_pic": urlPath}, "อัปโหลดรูปโปรไฟล์สำเร็จ")
}
