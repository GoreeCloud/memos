package wardveil

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestEvaluateCurrentAuthoritativeProtectedStatus(t *testing.T) {
	now := time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)
	record := protectedFixture(now)
	result := Evaluate(record, now)
	require.Equal(t, StateProtected, result.State)
	require.Equal(t, "Protected", result.Label)
	require.True(t, result.ProtectedByWardveil)
	require.Empty(t, result.Reason)
}

func TestEvaluateProtectedStatusFailsClosedWhenStale(t *testing.T) {
	now := time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)
	record := protectedFixture(now)
	record.Evidence.Status = EvidenceStale
	record.State = StateAttention
	record.Claim.ProtectedByWardveil = false
	result := Evaluate(record, now)
	require.Equal(t, StateUnknown, result.State)
	require.False(t, result.ProtectedByWardveil)
	require.Equal(t, "Wardveil evidence is stale", result.Reason)
}

func TestEvaluateProtectedStatusFailsClosedWhenExpired(t *testing.T) {
	now := time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)
	record := protectedFixture(now)
	expired := now.Add(-time.Minute).Format(time.RFC3339)
	record.Evidence.ValidUntil = &expired
	result := Evaluate(record, now)
	require.Equal(t, StateUnknown, result.State)
	require.False(t, result.ProtectedByWardveil)
	require.Contains(t, result.Reason, "expired")
}

func TestValidateRejectsNonauthoritativeProtectedStatus(t *testing.T) {
	now := time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)
	record := protectedFixture(now)
	record.Authority.Authoritative = false
	require.ErrorContains(t, ValidateStatus(record), "authoritative producer")
}

func TestDecodeRejectsUnknownFieldsAndSensitiveEvidence(t *testing.T) {
	now := time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)
	record := protectedFixture(now)
	payload, err := json.Marshal(record)
	require.NoError(t, err)
	payload = append(payload[:len(payload)-1], []byte(",\"unexpected\":true}")...)
	_, err = DecodeStatus(payload)
	require.Error(t, err)

	record = protectedFixture(now)
	summary := "authorization: bearer reusable-secret"
	record.Evidence.Summary = &summary
	require.ErrorContains(t, ValidateStatus(record), "sensitive Wardveil evidence marker rejected")
}

func TestAccessibleStateLabelsAreTextual(t *testing.T) {
	expected := map[State]string{
		StateProtected:     "Protected",
		StateAttention:     "Attention required",
		StateDegraded:      "Degraded",
		StateUnknown:       "Unknown",
		StateNotApplicable: "Not applicable",
	}
	for state, label := range expected {
		require.Equal(t, label, Label(state))
		require.NotEmpty(t, label)
	}
}

func protectedFixture(now time.Time) StatusRecord {
	validUntil := now.Add(10 * time.Minute).Format(time.RFC3339)
	return StatusRecord{
		ContractVersion: ContractVersion,
		Scope:           Scope{Kind: "application", ID: "goreecloud-memos"},
		Authority: Authority{
			System:        "Wardveil Security",
			Control:       "application-security",
			Authoritative: true,
		},
		State: StateProtected,
		Evidence: Evidence{
			Status:     EvidenceCurrent,
			ObservedAt: now.Add(-time.Minute).Format(time.RFC3339),
			ValidUntil: &validUntil,
		},
		Claim: Claim{ProtectedByWardveil: true},
		Privacy: Privacy{
			DetailsWithheld: true,
			Redactions:      []string{"private diagnostics withheld"},
		},
	}
}
