package database

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// Migration is one numbered up/down pair, e.g. 0003_add_x.{up,down}.sql.
type Migration struct {
	Version int
	Name    string
	Up      string
	Down    string
}

// LoadMigrations reads the embedded migrations ordered by version.
func LoadMigrations() ([]Migration, error) { return loadMigrations(migrationFS, "migrations") }

func loadMigrations(fsys fs.FS, dir string) ([]Migration, error) {
	entries, err := fs.ReadDir(fsys, dir)
	if err != nil {
		return nil, err
	}
	byVersion := map[int]*Migration{}
	for _, e := range entries {
		name := e.Name()
		var dirn string
		switch {
		case strings.HasSuffix(name, ".up.sql"):
			dirn = "up"
		case strings.HasSuffix(name, ".down.sql"):
			dirn = "down"
		default:
			return nil, fmt.Errorf("migration %q must end in .up.sql or .down.sql", name)
		}
		var version int
		if _, err := fmt.Sscanf(name, "%d_", &version); err != nil || version <= 0 {
			return nil, fmt.Errorf("migration %q must start with a version number", name)
		}
		body, err := fs.ReadFile(fsys, dir+"/"+name)
		if err != nil {
			return nil, err
		}
		m := byVersion[version]
		if m == nil {
			base := strings.TrimSuffix(strings.TrimSuffix(name, ".up.sql"), ".down.sql")
			m = &Migration{Version: version, Name: base}
			byVersion[version] = m
		}
		if dirn == "up" {
			m.Up = string(body)
		} else {
			m.Down = string(body)
		}
	}
	out := make([]Migration, 0, len(byVersion))
	for _, m := range byVersion {
		if m.Up == "" {
			return nil, fmt.Errorf("migration %d has no .up.sql", m.Version)
		}
		out = append(out, *m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Version < out[j].Version })
	return out, nil
}

// Migrator applies migrations on a connection opened with multiStatements=true.
type Migrator struct {
	db   *sql.DB
	migs []Migration
}

func NewMigrator(db *sql.DB) (*Migrator, error) {
	migs, err := LoadMigrations()
	if err != nil {
		return nil, err
	}
	return &Migrator{db: db, migs: migs}, nil
}

func (m *Migrator) ensureTable() error {
	_, err := m.db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version INT NOT NULL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		applied_at DATETIME NOT NULL
	)`)
	return err
}

// Applied returns the set of applied versions.
func (m *Migrator) Applied() (map[int]bool, error) {
	if err := m.ensureTable(); err != nil {
		return nil, err
	}
	rows, err := m.db.Query(`SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	set := map[int]bool{}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		set[v] = true
	}
	return set, rows.Err()
}

// Status lists every known migration with whether it has been applied.
func (m *Migrator) Status() ([]string, error) {
	applied, err := m.Applied()
	if err != nil {
		return nil, err
	}
	lines := make([]string, 0, len(m.migs))
	for _, mg := range m.migs {
		mark := "pending"
		if applied[mg.Version] {
			mark = "applied"
		}
		lines = append(lines, fmt.Sprintf("%-8s %s", mark, mg.Name))
	}
	return lines, nil
}

// Up applies all pending migrations in order. A pre-existing database that
// predates the runner (tables present, no history) is refused: run Baseline.
func (m *Migrator) Up() ([]string, error) {
	applied, err := m.Applied()
	if err != nil {
		return nil, err
	}
	if len(applied) == 0 {
		var n int
		if err := m.db.QueryRow(`SELECT COUNT(*) FROM information_schema.tables
			WHERE table_schema = DATABASE() AND table_name = 'member_profile'`).Scan(&n); err != nil {
			return nil, err
		}
		if n > 0 {
			return nil, fmt.Errorf("database already has tables but no migration history; run 'baseline <version>' first")
		}
	}
	var done []string
	for _, mg := range m.migs {
		if applied[mg.Version] {
			continue
		}
		if _, err := m.db.Exec(mg.Up); err != nil {
			return done, fmt.Errorf("apply %s: %w", mg.Name, err)
		}
		if err := m.record(mg); err != nil {
			return done, err
		}
		done = append(done, mg.Name)
	}
	return done, nil
}

// Down reverts the most recently applied migration.
func (m *Migrator) Down() (string, error) {
	applied, err := m.Applied()
	if err != nil {
		return "", err
	}
	for i := len(m.migs) - 1; i >= 0; i-- {
		mg := m.migs[i]
		if !applied[mg.Version] {
			continue
		}
		if mg.Down == "" {
			return "", fmt.Errorf("%s has no .down.sql", mg.Name)
		}
		if _, err := m.db.Exec(mg.Down); err != nil {
			return "", fmt.Errorf("revert %s: %w", mg.Name, err)
		}
		_, err := m.db.Exec(`DELETE FROM schema_migrations WHERE version = ?`, mg.Version)
		return mg.Name, err
	}
	return "", nil
}

// Baseline records every migration <= version as applied without running it,
// for databases that were migrated by hand before the runner existed.
func (m *Migrator) Baseline(version int) error {
	if err := m.ensureTable(); err != nil {
		return err
	}
	for _, mg := range m.migs {
		if mg.Version > version {
			break
		}
		if err := m.record(mg); err != nil {
			return err
		}
	}
	return nil
}

func (m *Migrator) record(mg Migration) error {
	_, err := m.db.Exec(`INSERT IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`,
		mg.Version, mg.Name, time.Now())
	return err
}
