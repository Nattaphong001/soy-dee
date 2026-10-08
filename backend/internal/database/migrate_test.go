package database

import (
	"testing"
	"testing/fstest"
)

func TestEmbeddedMigrationsAreOrderedAndReversible(t *testing.T) {
	migs, err := LoadMigrations()
	if err != nil {
		t.Fatal(err)
	}
	if len(migs) == 0 {
		t.Fatal("no migrations embedded")
	}
	for i, m := range migs {
		if m.Version != i+1 {
			t.Errorf("migration %s: version %d, want contiguous %d", m.Name, m.Version, i+1)
		}
		if m.Down == "" {
			t.Errorf("migration %s has no .down.sql", m.Name)
		}
	}
}

func TestLoadMigrationsRejectsBadNames(t *testing.T) {
	cases := map[string]fstest.MapFS{
		"no suffix":  {"m/0001_x.sql": {Data: []byte("x")}},
		"no version": {"m/init.up.sql": {Data: []byte("x")}},
		"down only":  {"m/0001_x.down.sql": {Data: []byte("x")}},
	}
	for name, fsys := range cases {
		if _, err := loadMigrations(fsys, "m"); err == nil {
			t.Errorf("%s: expected error", name)
		}
	}
}
