package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"soydee-api/internal/models"
	"soydee-api/pkg/utils"
)

var ErrNotFound = errors.New("record not found")

type MemberRepository struct {
	db *sql.DB
}

func NewMemberRepository(db *sql.DB) *MemberRepository {
	return &MemberRepository{db: db}
}

func (r *MemberRepository) FindByUsername(ctx context.Context, username string) (*models.MemberProfile, error) {
	const query = `
		SELECT mb_id, mb_user_name, mb_password_hash, mb_gender, mb_full_name,
		       mb_birth_date, mb_profile_pic, mb_created_at, mb_updated_at
		FROM member_profile
		WHERE mb_user_name = ?`

	return r.scanOne(r.db.QueryRowContext(ctx, query, username))
}

func (r *MemberRepository) FindByID(ctx context.Context, id int) (*models.MemberProfile, error) {
	const query = `
		SELECT mb_id, mb_user_name, mb_password_hash, mb_gender, mb_full_name,
		       mb_birth_date, mb_profile_pic, mb_created_at, mb_updated_at
		FROM member_profile
		WHERE mb_id = ?`

	return r.scanOne(r.db.QueryRowContext(ctx, query, id))
}

func (r *MemberRepository) scanOne(row *sql.Row) (*models.MemberProfile, error) {
	var m models.MemberProfile
	err := row.Scan(
		&m.MbID, &m.MbUserName, &m.MbPasswordHash, &m.MbGender, &m.MbFullName,
		&m.MbBirthDate, &m.MbProfilePic, &m.MbCreatedAt, &m.MbUpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan member_profile: %w", err)
	}
	return &m, nil
}

func (r *MemberRepository) UsernameExists(ctx context.Context, username string) (bool, error) {
	const query = `SELECT 1 FROM member_profile WHERE mb_user_name = ? LIMIT 1`

	var exists int
	err := r.db.QueryRowContext(ctx, query, username).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check username exists: %w", err)
	}
	return true, nil
}

// CreateWithBodyStats inserts a new member_profile, its initial
// member_body_stats row, and the resulting member_bmr_history calculation,
// all in a single transaction (API_SPEC.md §4.1, SOYDEE_AI_TASK.md §5 หน้า1).
// If any of the three inserts fails the whole registration rolls back —
// previously only the first two tables were written, which left new members
// looking at an empty dashboard with no BMI/BMR/TDEE to show.
func (r *MemberRepository) CreateWithBodyStats(ctx context.Context, m *models.MemberProfile, bs *models.MemberBodyStats) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	const insertMember = `
		INSERT INTO member_profile (mb_user_name, mb_password_hash, mb_gender, mb_full_name, mb_birth_date)
		VALUES (?, ?, ?, ?, ?)`

	res, err := tx.ExecContext(ctx, insertMember, m.MbUserName, m.MbPasswordHash, m.MbGender, m.MbFullName, m.MbBirthDate)
	if err != nil {
		return 0, fmt.Errorf("insert member_profile: %w", err)
	}

	mbID, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("get member insert id: %w", err)
	}

	const insertBodyStats = `
		INSERT INTO member_body_stats (mbs_weight, mbs_height, mbs_activity_level, mbs_target, mb_id)
		VALUES (?, ?, ?, ?, ?)`

	bsRes, err := tx.ExecContext(ctx, insertBodyStats, bs.MbsWeight, bs.MbsHeight, bs.MbsActivityLevel, bs.MbsTarget, mbID)
	if err != nil {
		return 0, fmt.Errorf("insert member_body_stats: %w", err)
	}

	mbsID, err := bsRes.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("get body stats insert id: %w", err)
	}

	if m.MbGender == nil || m.MbBirthDate == nil ||
		bs.MbsWeight == nil || bs.MbsHeight == nil || bs.MbsActivityLevel == nil || bs.MbsTarget == nil {
		return 0, fmt.Errorf("insert member_bmr_history: incomplete body data")
	}

	recordDate := utils.Today()
	result := utils.ComputeBMR(*m.MbGender, *m.MbBirthDate, recordDate,
		*bs.MbsWeight, *bs.MbsHeight, *bs.MbsActivityLevel, *bs.MbsTarget)

	const insertBmr = `
		INSERT INTO member_bmr_history (mbh_record_date, mbh_bmi, mbh_eval_result, mbh_bmr, mbh_tdee, mbh_tdee_target, mb_id, mbs_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	if _, err := tx.ExecContext(ctx, insertBmr,
		recordDate, result.BMI, result.EvalResult, result.BMR, result.TDEE, result.TDEETarget, mbID, mbsID); err != nil {
		return 0, fmt.Errorf("insert member_bmr_history: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return mbID, nil
}

func (r *MemberRepository) UpdateProfile(ctx context.Context, m *models.MemberProfile) error {
	const query = `
		UPDATE member_profile
		SET mb_full_name = ?, mb_user_name = ?, mb_gender = ?, mb_birth_date = ?, mb_profile_pic = ?
		WHERE mb_id = ?`

	res, err := r.db.ExecContext(ctx, query, m.MbFullName, m.MbUserName, m.MbGender, m.MbBirthDate, m.MbProfilePic, m.MbID)
	if err != nil {
		return fmt.Errorf("update member_profile: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *MemberRepository) UpdatePassword(ctx context.Context, mbID int, newHash string) error {
	const query = `UPDATE member_profile SET mb_password_hash = ? WHERE mb_id = ?`

	res, err := r.db.ExecContext(ctx, query, newHash, mbID)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *MemberRepository) UpdateAvatar(ctx context.Context, mbID int, path string) error {
	const query = `UPDATE member_profile SET mb_profile_pic = ? WHERE mb_id = ?`

	res, err := r.db.ExecContext(ctx, query, path, mbID)
	if err != nil {
		return fmt.Errorf("update avatar: %w", err)
	}
	return checkRowsAffected(res)
}

func checkRowsAffected(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
