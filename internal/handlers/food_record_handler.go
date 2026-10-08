package handlers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"soydee-api/internal/dto"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/internal/services"
	"soydee-api/pkg/utils"
)

type FoodRecordHandler struct {
	svc      *services.FoodRecordService
	imageDir string // filesystem dir, e.g. "uploads/food-images"
}

func NewFoodRecordHandler(svc *services.FoodRecordService, imageDir string) *FoodRecordHandler {
	return &FoodRecordHandler{svc: svc, imageDir: imageDir}
}

// foodImageURLPrefix is the only path prefix accepted for dfd_image
// (see dto.FoodRecordRequest.Validate) — must match the route served by
// router.go for the uploads dir.
const foodImageURLPrefix = "/uploads/food-images/"

var foodImageExtByMime = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// removeFoodImage deletes an uploaded photo from disk (best-effort). Only
// paths under foodImageURLPrefix are touched, and only the base name is used.
func (h *FoodRecordHandler) removeFoodImage(urlPath *string) {
	if urlPath == nil || !strings.HasPrefix(*urlPath, foodImageURLPrefix) {
		return
	}
	_ = os.Remove(filepath.Join(h.imageDir, filepath.Base(*urlPath)))
}

// UploadImage stores one food photo and returns its URL path; the client then
// sends that path as dfd_image on POST/PUT /food-records. The extension comes
// from the sniffed content, not the client filename.
func (h *FoodRecordHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

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

	if err := os.MkdirAll(h.imageDir, 0o755); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to prepare upload directory")
		return
	}

	filename := fmt.Sprintf("%d_%d%s", mbID, time.Now().UnixNano(), ext)
	dest, err := os.Create(filepath.Join(h.imageDir, filename))
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

	utils.Success(w, http.StatusCreated, map[string]string{"dfd_image": foodImageURLPrefix + filename}, "อัปโหลดรูปอาหารสำเร็จ")
}

func (h *FoodRecordHandler) List(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	date := utils.Today()
	if raw := r.URL.Query().Get("date"); raw != "" {
		date, err = utils.ParseDate(raw)
		if err != nil {
			utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "date must be in YYYY-MM-DD format")
			return
		}
	}

	items, err := h.svc.ListByMemberAndDate(r.Context(), mbID, date)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to list food records")
		return
	}

	utils.Success(w, http.StatusOK, items, "ดึงข้อมูลสำเร็จ")
}

func (h *FoodRecordHandler) Get(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dfdID, err := urlParamInt(r, "dfd_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dfd_id")
		return
	}

	record, err := h.svc.FindByID(r.Context(), dfdID)
	if errors.Is(err, repositories.ErrNotFound) || (err == nil && record.MbID != mbID) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "food record not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to get food record")
		return
	}

	utils.Success(w, http.StatusOK, record, "ดึงข้อมูลสำเร็จ")
}

func (h *FoodRecordHandler) Create(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}

	var req dto.FoodRecordRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	date, _ := utils.ParseDate(req.DfdDate)

	record := &models.DailyFoodRecord{
		DfdDate:     date,
		DfdTime:     req.DfdTime,
		DfdMealType: req.DfdMealType,
		DfdFoodName: req.DfdFoodName,
		DfdAmount:   req.DfdAmount,
		DfdImage:    req.DfdImage,
		MbID:        mbID,
		FdID:        req.FdID,
	}

	id, err := h.svc.Create(r.Context(), record)
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to save food record")
		return
	}

	utils.Success(w, http.StatusCreated, map[string]int64{"dfd_id": id}, "บันทึกอาหารสำเร็จ")
}

func (h *FoodRecordHandler) Update(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dfdID, err := urlParamInt(r, "dfd_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dfd_id")
		return
	}

	existing, err := h.svc.FindByID(r.Context(), dfdID)
	if errors.Is(err, repositories.ErrNotFound) || (err == nil && existing.MbID != mbID) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "food record not found")
		return
	}
	if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to load food record")
		return
	}

	var req dto.FoodRecordRequest
	if err := decodeJSON(r, &req); err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid request body")
		return
	}
	if v := req.Validate(); !v.Valid() {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, v.Message())
		return
	}

	date, _ := utils.ParseDate(req.DfdDate)
	existing.DfdDate = date
	existing.DfdTime = req.DfdTime
	existing.DfdMealType = req.DfdMealType
	existing.DfdFoodName = req.DfdFoodName
	existing.DfdAmount = req.DfdAmount
	oldImage := existing.DfdImage
	existing.DfdImage = req.DfdImage
	existing.FdID = req.FdID

	if err := h.svc.Update(r.Context(), existing); err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to update food record")
		return
	}
	if oldImage != nil && (req.DfdImage == nil || *req.DfdImage != *oldImage) {
		h.removeFoodImage(oldImage)
	}

	utils.Success(w, http.StatusOK, existing, "แก้ไขบันทึกอาหารสำเร็จ")
}

func (h *FoodRecordHandler) Delete(w http.ResponseWriter, r *http.Request) {
	mbID, err := urlParamInt(r, "id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid id")
		return
	}
	dfdID, err := urlParamInt(r, "dfd_id")
	if err != nil {
		utils.Error(w, http.StatusBadRequest, utils.CodeValidationError, "invalid dfd_id")
		return
	}

	existing, findErr := h.svc.FindByID(r.Context(), dfdID)

	if err := h.svc.Delete(r.Context(), dfdID, mbID); errors.Is(err, repositories.ErrNotFound) {
		utils.Error(w, http.StatusNotFound, utils.CodeNotFound, "food record not found")
		return
	} else if err != nil {
		utils.Error(w, http.StatusInternalServerError, utils.CodeInternalError, "failed to delete food record")
		return
	}
	if findErr == nil && existing.MbID == mbID {
		h.removeFoodImage(existing.DfdImage)
	}

	utils.Success(w, http.StatusOK, nil, "ลบบันทึกอาหารสำเร็จ")
}
