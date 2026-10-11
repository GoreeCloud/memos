// Package memocolor defines the portable, contrast-tested memo card palette.
package memocolor

// Valid accepts the empty/default style or a published portable color token.
// Arbitrary CSS values are deliberately disallowed at the API and import boundary.
func Valid(value string) bool {
	switch value {
	case "", "sky", "lavender", "mint", "peach", "rose", "butter", "slate":
		return true
	default:
		return false
	}
}
