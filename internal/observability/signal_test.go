package observability

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type fakePinger struct {
	err error
}

func (p fakePinger) PingContext(context.Context) error {
	return p.err
}

func TestBuildProcessLivenessSignal(t *testing.T) {
	now := time.Date(2026, 10, 8, 10, 0, 0, 123, time.UTC)
	signal := BuildProcessLivenessSignal(now)
	require.Equal(t, StateHealthy, signal.State)
	require.Equal(t, "process.liveness", signal.SignalType)
	require.Equal(t, ComponentID, signal.ComponentID)
	require.Equal(t, SourceID, signal.Source)
	require.Equal(t, DefaultTTL, signal.TTLSeconds)
	require.Empty(t, signal.CollectionGaps)
	require.NoError(t, ValidateSignal(signal))
}

func TestBuildDatabaseReadinessSignalHealthy(t *testing.T) {
	now := time.Date(2026, 10, 8, 10, 1, 0, 0, time.UTC)
	signal := BuildDatabaseReadinessSignal(context.Background(), fakePinger{}, now)
	require.Equal(t, StateHealthy, signal.State)
	require.Equal(t, "database.readiness", signal.SignalType)
	require.Empty(t, signal.CollectionGaps)
	require.NoError(t, ValidateSignal(signal))
}

func TestBuildDatabaseReadinessSignalFailsClosed(t *testing.T) {
	now := time.Date(2026, 10, 8, 10, 2, 0, 0, time.UTC)
	unavailable := BuildDatabaseReadinessSignal(context.Background(), fakePinger{err: errors.New("database unavailable with secret detail")}, now)
	require.Equal(t, StateUnavailable, unavailable.State)
	require.Equal(t, []string{"database_ping_failed"}, unavailable.CollectionGaps)
	require.NoError(t, ValidateSignal(unavailable))

	unknown := BuildDatabaseReadinessSignal(context.Background(), nil, now)
	require.Equal(t, StateUnknown, unknown.State)
	require.Equal(t, []string{"database_handle_missing"}, unknown.CollectionGaps)
	require.NoError(t, ValidateSignal(unknown))
}

func TestValidateSignalRejectsSensitiveAttributeKeys(t *testing.T) {
	signal := BuildProcessLivenessSignal(time.Now())
	signal.Attributes = map[string]any{"access_token": "redacted"}
	require.ErrorContains(t, ValidateSignal(signal), "sensitive telemetry attribute key rejected")
}

func TestValidateSignalRejectsCollectedBeforeObserved(t *testing.T) {
	now := time.Date(2026, 10, 8, 10, 3, 0, 0, time.UTC)
	signal := BuildProcessLivenessSignal(now)
	signal.CollectedAt = now.Add(-time.Second).Format(time.RFC3339Nano)
	require.ErrorContains(t, ValidateSignal(signal), "collected_at cannot precede observed_at")
}
