package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"soydee-api/internal/dto"
	"soydee-api/pkg/utils"
)

// masterImageKind describes one master-data image bucket: the URL prefix
// stored in the DB and the sub-directory it maps to under the uploads root.
type masterImageKind struct {
	urlPrefix string
	subDir    string
}

var (
	foodCategoryImages = masterImageKind{urlPrefix: dto.FoodCategoryImagePrefix, subDir: "food-category"}
	activityImages     = masterImageKind{urlPrefix: dto.ActivityImagePrefix, subDir: "activity"}
)

// MasterImageStore saves and deletes the admin-managed images of
// food_category / activity_master rows.
type MasterImageStore struct {
	root string // filesystem uploads root, e.g. "uploads"
}

func NewMasterImageStore(root string) *MasterImageStore {
	return &MasterImageStore{root: root}
}

// Remove deletes a previously uploaded image (best-effort). Only paths under
// the kind's URL prefix are touched, and only the base name is used.
func (s *MasterImageStore) Remove(kind masterImageKind, urlPath *string) {
	if s == nil || urlPath == nil || !strings.HasPrefix(*urlPath, kind.urlPrefix) {
		return
	}
	_ = os.Remove(filepath.Join(s.root, kind.subDir, filepath.Base(*urlPath)))
}

// Upload stores one image (jpg/png/webp, <= 5 MiB) and returns its URL path;
// the client then sends it as fd_images / act_images on POST/PUT. The extension
// comes from the sniffed content, not the client filename.
func (s *MasterImageStore) Upload(kind masterImageKind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxAvatarUploadBytes+(1<<20))
		if err := r.ParseMultipartForm(maxAvatarUploadBytes); err != nil {
			utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "image file is too large or malformed")
			return
		}

		file, _, err := r.FormFile("image")
		if err != nil {
			utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "image file is required")
			return
		}
		defer file.Close()

		sniff := make([]byte, 512)
		n, err := io.ReadFull(file, sniff)
		if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
			utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "failed to read image file")
			return
		}
		sniff = sniff[:n]
		ext, ok := foodImageExtByMime[http.DetectContentType(sniff)]
		if !ok {
			utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "image must be a valid jpg, png, or webp")
			return
		}

		dir := filepath.Join(s.root, kind.subDir)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to prepare upload directory")
			return
		}

		filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
		dest, err := os.Create(filepath.Join(dir, filename))
		if err != nil {
			utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save image")
			return
		}
		defer dest.Close()

		if _, err := dest.Write(sniff); err != nil {
			utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save image")
			return
		}
		if _, err := io.Copy(dest, file); err != nil {
			utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save image")
			return
		}

		utils.Success(w, http.StatusCreated, map[string]string{"path": kind.urlPrefix + filename}, "อัปโหลดรูปภาพสำเร็จ")
	}
}
