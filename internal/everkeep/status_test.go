package everkeep

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

func TestEvaluateReadyRequiresEveryCurrentDimension(t *testing.T) {
	now := time.Date(2026, 10, 8, 8, 0, 0, 0, time.UTC)
	policy := testPolicy()
	records := make([]StatusRecord, 0, len(policy.RequiredDimensions))
	for i, dimension := range policy.RequiredDimensions {
		records = append(records, readyRecord(dimension, now, i))
	}
	summary := Evaluate(policy, records, now)
	if summary.State != StateReady {
		t.Fatalf("expected ready, got %s: %v", summary.State, summary.Reasons)
	}
}

func TestEvaluateFailsClosedForMissingAndStaleEvidence(t *testing.T) {
	now := time.Date(2026, 10, 8, 8, 0, 0, 0, time.UTC)
	policy := testPolicy()
	records := []StatusRecord{
		readyRecord("backup_coverage", now, 0),
		readyRecord("restore_capability", now, 1),
	}
	stale := readyRecord("portability", now, 2)
	expired := now.Add(-time.Minute).Format(time.RFC3339)
	stale.FreshUntil = &expired
	records = append(records, stale)

	summary := Evaluate(policy, records, now)
	if summary.State != StateUnknown {
		t.Fatalf("expected unknown for stale/missing evidence, got %s", summary.State)
	}
	if summary.Dimensions["portability"] != StateUnknown {
		t.Fatalf("expected stale portability to fail closed, got %s", summary.Dimensions["portability"])
	}
	if summary.Dimensions["migration"] != StateUnknown {
		t.Fatalf("expected missing migration to fail closed, got %s", summary.Dimensions["migration"])
	}
}

func TestEvaluateFailedRestoreCannotProduceReady(t *testing.T) {
	now := time.Date(2026, 10, 8, 8, 0, 0, 0, time.UTC)
	policy := Policy{Producer: "Everkeep", Scope: "goreecloud-memos", RequiredDimensions: []string{"backup_coverage", "restore_capability"}}
	backup := readyRecord("backup_coverage", now, 0)
	restore := readyRecord("restore_capability", now, 1)
	restore.State = StateDegraded
	reason := "clean-target restore verification failed"
	restore.Reason = &reason

	summary := Evaluate(policy, []StatusRecord{backup, restore}, now)
	if summary.State != StateDegraded {
		t.Fatalf("expected degraded, got %s", summary.State)
	}
}

func TestEvaluateUsesNewestEvidenceWithoutHidingRegression(t *testing.T) {
	now := time.Date(2026, 10, 8, 8, 0, 0, 0, time.UTC)
	policy := Policy{Producer: "Everkeep", Scope: "goreecloud-memos", RequiredDimensions: []string{"restore_capability"}}
	oldReady := readyRecord("restore_capability", now.Add(-time.Hour), 0)
	latest := readyRecord("restore_capability", now, 1)
	latest.State = StateAttention
	reason := "restore test is due"
	latest.Reason = &reason

	summary := Evaluate(policy, []StatusRecord{oldReady, latest}, now)
	if summary.State != StateAttention {
		t.Fatalf("expected latest attention state, got %s", summary.State)
	}
}

func TestDecodeRecordRejectsMalformedOrSensitiveEvidence(t *testing.T) {
	now := time.Date(2026, 10, 8, 8, 0, 0, 0, time.UTC)
	record := readyRecord("backup_coverage", now, 0)
	fresh := *record.FreshUntil

	extraField := fmt.Sprintf(`{"record_id":"r","producer":"Everkeep","scope":"goreecloud-memos","dimension":"backup_coverage","state":"ready","observed_at":"%s","fresh_until":"%s","required_evidence":true,"verification_method":"restore test","evidence_reference":"evidence://safe","token":"do-not-accept"}`, record.ObservedAt, fresh)
	if _, err := DecodeRecord([]byte(extraField)); err == nil {
		t.Fatal("expected unknown field to fail closed")
	}

	sensitive := strings.Replace(extraField, `,"token":"do-not-accept"`, "", 1)
	sensitive = strings.Replace(sensitive, "evidence://safe", "https://evidence.invalid/?access_token=secret", 1)
	if _, err := DecodeRecord([]byte(sensitive)); err == nil {
		t.Fatal("expected sensitive evidence marker to be rejected")
	}
}

func TestEvaluateWrongProducerAndFutureEvidenceFailClosed(t *testing.T) {
	now := time.Date(2026, 10, 8, 8, 0, 0, 0, time.UTC)
	policy := Policy{Producer: "Everkeep", Scope: "goreecloud-memos", RequiredDimensions: []string{"backup_coverage"}}

	wrongProducer := readyRecord("backup_coverage", now, 0)
	wrongProducer.Producer = "untrusted"
	if summary := Evaluate(policy, []StatusRecord{wrongProducer}, now); summary.State != StateUnknown {
		t.Fatalf("expected untrusted producer to be ignored, got %s", summary.State)
	}

	future := readyRecord("backup_coverage", now.Add(10*time.Minute), 1)
	if summary := Evaluate(policy, []StatusRecord{future}, now); summary.State != StateUnknown {
		t.Fatalf("expected implausible future evidence to fail closed, got %s", summary.State)
	}
}

func testPolicy() Policy {
	return Policy{
		Producer: "Everkeep",
		Scope:    "goreecloud-memos",
		RequiredDimensions: []string{
			"backup_coverage",
			"restore_capability",
			"recovery_freshness",
			"portability",
			"migration",
			"documentation",
			"provenance",
		},
	}
}

func readyRecord(dimension string, observed time.Time, id int) StatusRecord {
	fresh := observed.Add(2 * time.Hour).Format(time.RFC3339)
	evidence := fmt.Sprintf("evidence://memos/%s/%d", dimension, id)
	return StatusRecord{
		RecordID:           fmt.Sprintf("record-%d", id),
		Producer:           "Everkeep",
		Scope:              "goreecloud-memos",
		Dimension:          dimension,
		State:              StateReady,
		ObservedAt:         observed.Format(time.RFC3339),
		FreshUntil:         &fresh,
		RequiredEvidence:   true,
		VerificationMethod: "exact-revision automated acceptance",
		EvidenceReference:  &evidence,
	}
}
