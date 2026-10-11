package memocolor

import "testing"

func TestValid(t *testing.T) {
	for _, color := range []string{"", "sky", "lavender", "mint", "peach", "rose", "butter", "slate"} {
		if !Valid(color) {
			t.Errorf("expected accepted token %q", color)
		}
	}
	for _, color := range []string{"#ff0000", "url(javascript:alert(1))", "SKY", "amber", " white ", "none"} {
		if Valid(color) {
			t.Errorf("unsafe or unrecognized token %q must be rejected", color)
		}
	}
}
