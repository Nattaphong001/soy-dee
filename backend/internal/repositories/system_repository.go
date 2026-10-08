package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"soydee-api/internal/models"
)

// SystemRepository reads admin accounts from system_data.
// Not part of the original scaffold list — added because /auth/login/admin
// (API_SPEC.md §3.2) needs to query this table.
type SystemRepository struct {
	db *sql.DB
}

func NewSystemRepository(db *sql.DB) *SystemRepository {
	return &SystemRepository{db: db}
}

// UsernameExists checks system_data — used at member registration so a
// username can't be reused across member_profile and system_data
// (SOYDEE_AI_TASK.md §5 หน้า2: usernames must not collide across roles).
func (r *SystemRepository) UsernameExists(ctx context.Context, username string) (bool, error) {
	const query = `SELECT 1 FROM system_data WHERE sys_username = ? LIMIT 1`

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

func (r *SystemRepository) FindByUsername(ctx context.Context, username string) (*models.SystemData, error) {
	const query = `
		SELECT sys_id, sys_username, sys_full_name, sys_avatar_pic, sys_password, created_at
		FROM system_data WHERE sys_username = ?`

	return r.scanOne(r.db.QueryRowContext(ctx, query, username))
}

// FindByID looks up an admin account by sys_id — sys_id comes from the JWT
// claims on /admin/* routes (there is no {id} URL param, unlike /members/{id}).
func (r *SystemRepository) FindByID(ctx context.Context, sysID int) (*models.SystemData, error) {
	const query = `
		SELECT sys_id, sys_username, sys_full_name, sys_avatar_pic, sys_password, created_at
		FROM system_data WHERE sys_id = ?`

	return r.scanOne(r.db.QueryRowContext(ctx, query, sysID))
}

func (r *SystemRepository) scanOne(row *sql.Row) (*models.SystemData, error) {
	var s models.SystemData
	err := row.Scan(&s.SysID, &s.SysUsername, &s.SysFullName, &s.SysAvatarPic, &s.SysPassword, &s.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan system_data: %w", err)
	}
	return &s, nil
}

func (r *SystemRepository) UpdateProfile(ctx context.Context, sysID int, fullName, userName string) error {
	const query = `UPDATE system_data SET sys_full_name = ?, sys_username = ? WHERE sys_id = ?`

	res, err := r.db.ExecContext(ctx, query, fullName, userName, sysID)
	if err != nil {
		return fmt.Errorf("update system_data profile: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *SystemRepository) UpdateAvatar(ctx context.Context, sysID int, path string) error {
	const query = `UPDATE system_data SET sys_avatar_pic = ? WHERE sys_id = ?`

	res, err := r.db.ExecContext(ctx, query, path, sysID)
	if err != nil {
		return fmt.Errorf("update system_data avatar: %w", err)
	}
	return checkRowsAffected(res)
}

func (r *SystemRepository) UpdatePassword(ctx context.Context, sysID int, newHash string) error {
	const query = `UPDATE system_data SET sys_password = ? WHERE sys_id = ?`

	res, err := r.db.ExecContext(ctx, query, newHash, sysID)
	if err != nil {
		return fmt.Errorf("update system_data password: %w", err)
	}
	return checkRowsAffected(res) // defined in member_repository.go (same package)
}
