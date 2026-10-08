package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"soydee-api/internal/models"
)

type BmrRepository struct {
	db *sql.DB
}

func NewBmrRepository(db *sql.DB) *BmrRepository {
	return &BmrRepository{db: db}
}

const bmrSelectColumns = `mbh_id, mbh_record_date, mbh_bmi, mbh_eval_result, mbh_bmr, mbh_tdee, mbh_tdee_target, mb_id, mbs_id`

func (r *BmrRepository) Create(ctx context.Context, h *models.MemberBmrHistory) (int64, error) {
	const query = `
		INSERT INTO member_bmr_history (mbh_record_date, mbh_bmi, mbh_eval_result, mbh_bmr, mbh_tdee, mbh_tdee_target, mb_id, mbs_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	res, err := r.db.ExecContext(ctx, query,
		h.MbhRecordDate, h.MbhBMI, h.MbhEvalResult, h.MbhBMR, h.MbhTDEE, h.MbhTDEETarget, h.MbID, h.MbsID)
	if err != nil {
		return 0, fmt.Errorf("insert member_bmr_history: %w", err)
	}
	return res.LastInsertId()
}

// ListByMember returns history rows for mbID within an optional [from, to]
// date range (API_SPEC.md §6.2), newest first, with offset pagination.
func (r *BmrRepository) ListByMember(ctx context.Context, mbID int, from, to *time.Time, limit, offset int) ([]models.MemberBmrHistory, int, error) {
	query := `SELECT ` + bmrSelectColumns + ` FROM member_bmr_history WHERE mb_id = ?`
	countQuery := `SELECT COUNT(*) FROM member_bmr_history WHERE mb_id = ?`
	args := []interface{}{mbID}

	if from != nil {
		query += ` AND mbh_record_date >= ?`
		countQuery += ` AND mbh_record_date >= ?`
		args = append(args, *from)
	}
	if to != nil {
		query += ` AND mbh_record_date <= ?`
		countQuery += ` AND mbh_record_date <= ?`
		args = append(args, *to)
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count member_bmr_history: %w", err)
	}

	// mbh_id DESC breaks ties when two rows share mbh_record_date (SOYDEE_AI_TASK.md
	// §5 หน้า7 — mb_id=6 has 3 rows on the same date) so "newest" always means
	// most-recently-inserted, not an arbitrary row MySQL happens to return first.
	query += ` ORDER BY mbh_record_date DESC, mbh_id DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list member_bmr_history: %w", err)
	}
	defer rows.Close()

	items := []models.MemberBmrHistory{}
	for rows.Next() {
		h, err := scanBmrRow(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *h)
	}
	return items, total, rows.Err()
}

func (r *BmrRepository) LatestByMember(ctx context.Context, mbID int) (*models.MemberBmrHistory, error) {
	query := `SELECT ` + bmrSelectColumns + ` FROM member_bmr_history WHERE mb_id = ? ORDER BY mbh_record_date DESC, mbh_id DESC LIMIT 1`

	row := r.db.QueryRowContext(ctx, query, mbID)
	var h models.MemberBmrHistory
	err := row.Scan(&h.MbhID, &h.MbhRecordDate, &h.MbhBMI, &h.MbhEvalResult, &h.MbhBMR, &h.MbhTDEE, &h.MbhTDEETarget, &h.MbID, &h.MbsID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan member_bmr_history: %w", err)
	}
	return &h, nil
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanBmrRow(row rowScanner) (*models.MemberBmrHistory, error) {
	var h models.MemberBmrHistory
	err := row.Scan(&h.MbhID, &h.MbhRecordDate, &h.MbhBMI, &h.MbhEvalResult, &h.MbhBMR, &h.MbhTDEE, &h.MbhTDEETarget, &h.MbID, &h.MbsID)
	if err != nil {
		return nil, fmt.Errorf("scan member_bmr_history: %w", err)
	}
	return &h, nil
}
