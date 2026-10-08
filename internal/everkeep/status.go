package everkeep

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"
)

type State string

const (
	StateReady         State = "ready"
	StateAttention     State = "attention"
	StateDegraded      State = "degraded"
	StateUnknown       State = "unknown"
	StateNotApplicable State = "not_applicable"
)

const maxFutureClockSkew = 5 * time.Minute

var allowedDimensions = map[string]struct{}{
	"backup_coverage":     {},
	"restore_capability":  {},
	"recovery_freshness":  {},
	"portability":         {},
	"migration":           {},
	"dependency_recovery": {},
	"redundancy":          {},
	"documentation":       {},
	"ownership_custody":   {},
	"succession":          {},
	"preservation":        {},
	"provenance":          {},
}

var sensitiveMarkers = []string{
	"authorization: bearer",
	"password=",
	"access_token=",
	"refresh_token=",
	"api_key=",
	"secret=",
	"private key",
	"recovery code",
	"session cookie",
}

type StatusRecord struct {
	RecordID           string   `json:"record_id"`
	Producer           string   `json:"producer"`
	Scope              string   `json:"scope"`
	Dimension          string   `json:"dimension"`
	State              State    `json:"state"`
	ObservedAt         string   `json:"observed_at"`
	FreshUntil         *string  `json:"fresh_until,omitempty"`
	RequiredEvidence   bool     `json:"required_evidence"`
	VerificationMethod string   `json:"verification_method"`
	EvidenceReference  *string  `json:"evidence_reference,omitempty"`
	Reason             *string  `json:"reason,omitempty"`
	Limitations        []string `json:"limitations,omitempty"`
}

type Policy struct {
	Producer           string
	Scope              string
	RequiredDimensions []string
}

type Summary struct {
	State      State
	Dimensions map[string]State
	Reasons    []string
}

func DecodeRecord(data []byte) (StatusRecord, error) {
	var record StatusRecord
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&record); err != nil {
		return StatusRecord{}, fmt.Errorf("decode continuity record: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return StatusRecord{}, errors.New("decode continuity record: trailing data")
	}
	if err := validateRecord(record); err != nil {
		return StatusRecord{}, err
	}
	return record, nil
}

func Evaluate(policy Policy, records []StatusRecord, now time.Time) Summary {
	summary := Summary{State: StateReady, Dimensions: map[string]State{}}
	if strings.TrimSpace(policy.Producer) == "" || strings.TrimSpace(policy.Scope) == "" || len(policy.RequiredDimensions) == 0 {
		summary.State = StateUnknown
		summary.Reasons = append(summary.Reasons, "invalid evaluation policy")
		return summary
	}

	required := map[string]struct{}{}
	for _, dimension := range policy.RequiredDimensions {
		if _, ok := allowedDimensions[dimension]; !ok {
			summary.State = StateUnknown
			summary.Reasons = append(summary.Reasons, "unknown required dimension: "+dimension)
			return summary
		}
		required[dimension] = struct{}{}
	}

	latest := map[string]StatusRecord{}
	latestTime := map[string]time.Time{}
	invalid := map[string]bool{}
	for _, record := range records {
		if record.Producer != policy.Producer || record.Scope != policy.Scope {
			continue
		}
		if _, needed := required[record.Dimension]; !needed {
			continue
		}
		if err := validateRecord(record); err != nil {
			invalid[record.Dimension] = true
			continue
		}
		observed, _ := time.Parse(time.RFC3339, record.ObservedAt)
		if current, ok := latestTime[record.Dimension]; !ok || observed.After(current) {
			latest[record.Dimension] = record
			latestTime[record.Dimension] = observed
		}
	}

	for _, dimension := range policy.RequiredDimensions {
		if invalid[dimension] {
			summary.Dimensions[dimension] = StateUnknown
			summary.Reasons = append(summary.Reasons, dimension+": malformed evidence")
			continue
		}
		record, ok := latest[dimension]
		if !ok {
			summary.Dimensions[dimension] = StateUnknown
			summary.Reasons = append(summary.Reasons, dimension+": required evidence missing")
			continue
		}
		state, reason := evaluateRecord(record, now)
		summary.Dimensions[dimension] = state
		if reason != "" {
			summary.Reasons = append(summary.Reasons, dimension+": "+reason)
		}
	}

	summary.State = aggregate(summary.Dimensions, policy.RequiredDimensions)
	return summary
}

func validateRecord(record StatusRecord) error {
	if strings.TrimSpace(record.RecordID) == "" || len(record.RecordID) > 160 {
		return errors.New("invalid record_id")
	}
	if strings.TrimSpace(record.Producer) == "" || len(record.Producer) > 160 {
		return errors.New("invalid producer")
	}
	if strings.TrimSpace(record.Scope) == "" || len(record.Scope) > 240 {
		return errors.New("invalid scope")
	}
	if _, ok := allowedDimensions[record.Dimension]; !ok {
		return errors.New("invalid dimension")
	}
	switch record.State {
	case StateReady, StateAttention, StateDegraded, StateUnknown, StateNotApplicable:
	default:
		return errors.New("invalid state")
	}
	if _, err := time.Parse(time.RFC3339, record.ObservedAt); err != nil {
		return errors.New("invalid observed_at")
	}
	if record.FreshUntil != nil {
		if _, err := time.Parse(time.RFC3339, *record.FreshUntil); err != nil {
			return errors.New("invalid fresh_until")
		}
	}
	if record.State == StateReady && record.FreshUntil == nil {
		return errors.New("ready evidence requires fresh_until")
	}
	if strings.TrimSpace(record.VerificationMethod) == "" || len(record.VerificationMethod) > 500 {
		return errors.New("invalid verification_method")
	}
	if len(record.Limitations) > 25 {
		return errors.New("too many limitations")
	}
	for _, value := range append([]string{
		stringValue(record.EvidenceReference),
		stringValue(record.Reason),
		record.VerificationMethod,
	}, record.Limitations...) {
		if containsSensitiveMarker(value) {
			return errors.New("sensitive evidence marker rejected")
		}
	}
	return nil
}

func evaluateRecord(record StatusRecord, now time.Time) (State, string) {
	observed, _ := time.Parse(time.RFC3339, record.ObservedAt)
	if observed.After(now.Add(maxFutureClockSkew)) {
		return StateUnknown, "observed_at is implausibly in the future"
	}

	switch record.State {
	case StateReady:
		if record.FreshUntil == nil {
			return StateUnknown, "freshness deadline missing"
		}
		freshUntil, err := time.Parse(time.RFC3339, *record.FreshUntil)
		if err != nil || !freshUntil.After(now) {
			return StateUnknown, "ready evidence is stale or malformed"
		}
		if record.RequiredEvidence && strings.TrimSpace(stringValue(record.EvidenceReference)) == "" {
			return StateUnknown, "required evidence reference missing"
		}
		return StateReady, ""
	case StateDegraded:
		return StateDegraded, reasonOr(record, "degraded continuity evidence")
	case StateAttention:
		return StateAttention, reasonOr(record, "continuity evidence requires attention")
	case StateUnknown:
		return StateUnknown, reasonOr(record, "continuity state unknown")
	case StateNotApplicable:
		return StateUnknown, "required dimension cannot be not_applicable"
	default:
		return StateUnknown, "invalid continuity state"
	}
}

func aggregate(states map[string]State, required []string) State {
	result := StateReady
	for _, dimension := range required {
		state, ok := states[dimension]
		if !ok {
			state = StateUnknown
		}
		switch state {
		case StateDegraded:
			return StateDegraded
		case StateAttention:
			if result != StateDegraded {
				result = StateAttention
			}
		case StateUnknown, StateNotApplicable:
			if result == StateReady {
				result = StateUnknown
			}
		case StateReady:
		default:
			if result == StateReady {
				result = StateUnknown
			}
		}
	}
	return result
}

func containsSensitiveMarker(value string) bool {
	lower := strings.ToLower(value)
	for _, marker := range sensitiveMarkers {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	return false
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func reasonOr(record StatusRecord, fallback string) string {
	if reason := strings.TrimSpace(stringValue(record.Reason)); reason != "" {
		return reason
	}
	return fallback
}
