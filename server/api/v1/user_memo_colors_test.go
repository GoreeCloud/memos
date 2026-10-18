package v1

import "testing"

func TestValidateMemoColors(t *testing.T) {
	if err := validateMemoColors(nil); err != nil {
		t.Fatal(err)
	}
	if err := validateMemoColors(map[string]string{"memos/abc": "#DCEEFE"}); err != nil {
		t.Fatal(err)
	}
	if err := validateMemoColors(map[string]string{"users/abc": "#DCEEFE"}); err == nil {
		t.Fatal("invalid resource accepted")
	}
	if err := validateMemoColors(map[string]string{"memos/abc": "red"}); err == nil {
		t.Fatal("invalid color accepted")
	}
}
