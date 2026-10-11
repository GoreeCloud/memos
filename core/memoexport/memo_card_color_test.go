package memoexport

import (
	"encoding/json"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestCardColorExportRoundTrip(t *testing.T) {
	source := Memo{
		UID: "color-example", Creator: "owner",
		CreateTime: "2026-01-01T12:00:00Z", UpdateTime: "2026-01-01T12:00:00Z",
		State: "NORMAL", Visibility: "PRIVATE", ContentPath: "memos/color-example.md",
		CardColor: "lavender",
	}
	data, err := json.Marshal(source)
	require.NoError(t, err)
	var restored Memo
	require.NoError(t, json.Unmarshal(data, &restored))
	require.Equal(t, "lavender", restored.CardColor)
	warnings, err := validateMemo(&restored)
	require.NoError(t, err)
	require.Empty(t, warnings)
}

func TestInvalidExportedCardColorSafelyFallsBack(t *testing.T) {
	invalid := Memo{
		UID: "color-example", Creator: "owner",
		CreateTime: "2026-01-01T12:00:00Z", UpdateTime: "2026-01-01T12:00:00Z",
		State: "NORMAL", Visibility: "PRIVATE", ContentPath: "memos/color-example.md",
		CardColor: "url(javascript:alert(1))",
	}
	warnings, err := validateMemo(&invalid)
	require.NoError(t, err)
	require.Len(t, warnings, 1)
	require.Empty(t, invalid.CardColor)
}
