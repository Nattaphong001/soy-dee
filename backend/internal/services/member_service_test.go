package services

import (
	"context"
	"errors"
	"testing"

	"soydee-api/internal/models"
)

type fakeMemberStore struct {
	memberStore
	taken map[string]bool
	err   error
}

func (f fakeMemberStore) UsernameExists(_ context.Context, u string) (bool, error) {
	return f.taken[u], f.err
}

type fakeAdminNames struct {
	taken map[string]bool
	err   error
	calls *int
}

func (f fakeAdminNames) UsernameExists(_ context.Context, u string) (bool, error) {
	*f.calls++
	return f.taken[u], f.err
}

func TestMemberServiceUsernameTaken(t *testing.T) {
	boom := errors.New("db down")
	cases := []struct {
		name          string
		member, admin map[string]bool
		memberErr     error
		adminErr      error
		want          bool
		wantErr       bool
		wantAdminCall int
	}{
		{"free", nil, nil, nil, nil, false, false, 1},
		{"taken by member skips admin lookup", map[string]bool{"bob": true}, nil, nil, nil, true, false, 0},
		{"taken by admin", nil, map[string]bool{"bob": true}, nil, nil, true, false, 1},
		{"member lookup error", nil, nil, boom, nil, false, true, 0},
		{"admin lookup error", nil, nil, nil, boom, false, true, 1},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			calls := 0
			svc := NewMemberService(
				fakeMemberStore{taken: c.member, err: c.memberErr},
				fakeAdminNames{taken: c.admin, err: c.adminErr, calls: &calls},
			)
			got, err := svc.UsernameTaken(context.Background(), "bob")
			if (err != nil) != c.wantErr || got != c.want || calls != c.wantAdminCall {
				t.Fatalf("got (%v, %v) adminCalls=%d; want (%v, err=%v) adminCalls=%d",
					got, err, calls, c.want, c.wantErr, c.wantAdminCall)
			}
		})
	}
}

type fakeActivities struct{ act *models.ActivityMaster }

func (f fakeActivities) FindByID(context.Context, int) (*models.ActivityMaster, error) {
	return f.act, nil
}

func TestActivityRecordServiceFindActivity(t *testing.T) {
	want := &models.ActivityMaster{}
	svc := NewActivityRecordService(nil, fakeActivities{act: want})
	got, err := svc.FindActivity(context.Background(), 1)
	if err != nil || got != want {
		t.Fatalf("got (%v, %v)", got, err)
	}
}
