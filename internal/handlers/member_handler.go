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
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/pkg/utils"
)

const maxAvatarUploadBytes = 5 << 20 // 5 MiB

var allowedAvatarExts = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}

// allowedAvatarMimes is checked against the file's actual sniffed content
// (http.DetectContentType), not the client-supplied filename/extension,
// which can be spoofed.
var allowedAvatarMimes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

type MemberHandler struct {
	repo       *repositories.MemberRepository
	systemRepo *repositories.SystemRepository
	avatarDir  string // filesystem dir, e.g. "uploads/avatars"
}

func NewMemberHandler(repo *repositories.MemberRepository, systemRepo *repositories.SystemRepository, avatarDir string) *MemberHandler {
	return &MemberHandler{repo: repo, systemRepo: systemRepo, avatarDir: avatarDir}
}

func (h *MemberHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	exists, err := h.repo.UsernameExists(r.Context(), req.MbUserName)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to check username")
		return
	}
	if !exists {
		exists, err = h.systemRepo.UsernameExists(r.Context(), req.MbUserName)
		if err != nil {
			utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to check username")
			return
		}
	}
	if exists {
		utils.Error(w, http.StatusConflict, utils.CodeDuplicateUsername, "username is already taken")
		return
	}

	hash, err := utils.HashPassword(req.MbPassword)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to hash password")
		return
	}

	member := &models.MemberProfile{
		MbUserName:     req.MbUserName,
		MbPasswordHash: hash,
		MbGender:       req.MbGender,
		MbFullName:     req.MbFullName,
	}
	if req.MbBirthDate != "" {
		d, _ := utils.ParseDate(req.MbBirthDate)
		member.MbBirthDate = &d
	}

	bodyStats := &models.MemberBodyStats{
		MbsWeight:        req.BodyStats.MbsWeight,
		MbsHeight:        req.BodyStats.MbsHeight,
		MbsActivityLevel: req.BodyStats.MbsActivityLevel,
		MbsTarget:        req.BodyStats.MbsTarget,
	}

	mbID, err := h.repo.CreateWithBodyStats(r.Context(), member, bodyStats)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to register")
		return
	}

	utils.Success(w, http.StatusCreated, map[string]int64{"mb_id": mbID}, "ลงทะเบียนสำเร็จ")
}

func (h *MemberHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	member, err := h.repo.FindByID(r.Context(), id)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "member not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get profile")
		return
	}

	utils.Success(w, http.StatusOK, member, "ดึงข้อมูลโปรไฟล์สำเร็จ")
}

func (h *MemberHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.ProfileUpdateRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	existing, err := h.repo.FindByID(r.Context(), id)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "member not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load profile")
		return
	}

	// Username is immutable after registration — req.MbUserName is ignored here
	// even if the client sends a different value.
	existing.MbFullName = req.MbFullName
	if req.MbGender != nil {
		existing.MbGender = req.MbGender
	}
	if req.MbBirthDate != "" {
		d, _ := utils.ParseDate(req.MbBirthDate)
		existing.MbBirthDate = &d
	}
	if req.MbProfilePic != nil {
		existing.MbProfilePic = req.MbProfilePic
	}

	if err := h.repo.UpdateProfile(r.Context(), existing); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update profile")
		return
	}

	utils.Success(w, http.StatusOK, existing, "แก้ไขโปรไฟล์สำเร็จ")
}

func (h *MemberHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
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

	member, err := h.repo.FindByID(r.Context(), id)
	if errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "member not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load member")
		return
	}

	if !utils.CheckPassword(req.CurrentPassword, member.MbPasswordHash) {
		utils.Error(w, http.StatusUnauthorized, utils.CodeInvalidCredentials, "current password is incorrect")
		return
	}

	hash, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to hash password")
		return
	}

	if err := h.repo.UpdatePassword(r.Context(), id, hash); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update password")
		return
	}

	utils.Success(w, http.StatusOK, nil, "เปลี่ยนรหัสผ่านสำเร็จ")
}

func (h *MemberHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	id, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
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

	filename := fmt.Sprintf("%d%s", id, ext)
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
	if err := h.repo.UpdateAvatar(r.Context(), id, urlPath); errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "member not found")
		return
	} else if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save avatar")
		return
	}

	utils.Success(w, http.StatusOK, map[string]string{"mb_profile_pic": urlPath}, "อัปโหลดรูปโปรไฟล์สำเร็จ")
}
