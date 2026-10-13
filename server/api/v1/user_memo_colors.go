package v1

import (
	"fmt"
	"regexp"
)

const maxMemoColorPreferences = 5000

var memoColorKeyPattern = regexp.MustCompile(`^memos/[A-Za-z0-9_-]{1,128}$`)
var memoColorHexPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// Per-user card colors are bounded private presentation preferences.
func validateMemoColors(colors map[string]string) error {
	if len(colors) > maxMemoColorPreferences {
		return fmt.Errorf("too many memo color preferences")
	}
	for name, color := range colors {
		if !memoColorKeyPattern.MatchString(name) {
			return fmt.Errorf("invalid memo resource name")
		}
		if !memoColorHexPattern.MatchString(color) {
			return fmt.Errorf("invalid hex color")
		}
	}
	return nil
}
