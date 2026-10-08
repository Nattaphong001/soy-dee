package repositories

import (
	"reflect"
	"testing"
	"time"
)

func TestAvgClockWrapsMidnight(t *testing.T) {
	if got := avgClock(nil); got != nil {
		t.Fatalf("empty input: got %v, want nil", *got)
	}
	cases := []struct {
		in   []int
		want string
	}{
		{[]int{23*60 + 30, 30}, "00:00"},
		{[]int{22 * 60, 23 * 60}, "22:30"},
		{[]int{8 * 60}, "08:00"},
	}
	for _, c := range cases {
		if got := avgClock(c.in); got == nil || *got != c.want {
			t.Errorf("avgClock(%v) = %v, want %s", c.in, got, c.want)
		}
	}
}

func TestReportFilterWhereAndArgs(t *testing.T) {
	from := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	mb, gender := 7, 2
	f := ReportFilter{From: &from, MbID: &mb}

	where, args := f.whereAndArgs("d.dfd_date", "d.mb_id", whereCond{"fc.fd_traffic_light", nil}, whereCond{"mp.mb_gender", &gender})
	wantWhere := " WHERE d.dfd_date >= ? AND d.mb_id = ? AND mp.mb_gender = ?"
	if where != wantWhere {
		t.Errorf("where = %q, want %q", where, wantWhere)
	}
	if want := []interface{}{from, 7, 2}; !reflect.DeepEqual(args, want) {
		t.Errorf("args = %v, want %v", args, want)
	}

	if where, args := (ReportFilter{}).whereAndArgs("d.x", "d.mb_id"); where != "" || len(args) != 0 {
		t.Errorf("empty filter: got %q %v", where, args)
	}
}

func TestOffsetAndRange(t *testing.T) {
	if got := offsetOf(ReportFilter{Page: 1, Limit: 20}); got != 0 {
		t.Errorf("page 1 offset = %d", got)
	}
	if got := offsetOf(ReportFilter{Page: 3, Limit: 20}); got != 40 {
		t.Errorf("page 3 offset = %d", got)
	}
	if rangeOf(ReportFilter{}) != nil {
		t.Error("empty range should be nil")
	}
	to := time.Date(2026, 2, 3, 0, 0, 0, 0, time.UTC)
	if r := rangeOf(ReportFilter{To: &to}); r == nil || r.To != "2026-02-03" || r.From != "" {
		t.Errorf("range = %+v", r)
	}
}
