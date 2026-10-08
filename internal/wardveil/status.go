package wardveil

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"
)

const (
	ContractVersion    = "0.1.0"
	maxFutureClockSkew = 5 * time.Minute
	maxScopeValue      = 128
	maxAuthorityValue  = 128
	maxSummary         = 240
	maxReference       = 256
)

type State string

const (
	StateProtected     State = "protected"
	StateAttention     State = "attention"
	StateDegraded      State = "degraded"
	StateUnknown       State = "unknown"
	StateNotApplicable State = "not_applicable"
)

type EvidenceStatus string

const (
	EvidenceCurrent     EvidenceStatus = "current"
	EvidenceStale       EvidenceStatus = "stale"
	EvidenceUnavailable EvidenceStatus = "unavailable"
	EvidenceUnverified  EvidenceStatus = "unverified"
)

var allowedScopeKinds = map[string]struct{}{
	"account": {}, "application": {}, "service": {}, "device": {}, "network": {},
	"data": {}, "control": {}, "platform": {}, "other": {},
}

var sensitiveMarkers = []string{
	"authorization: bearer",
	"password=",
	"passwd=",
	"access_token=",
	"refresh_token=",
	"api_key=",
	"apikey=",
	"secret=",
	"private key",
	"recovery code",
	"session cookie",
	"set-cookie:",
}

type Scope struct {
	Kind        string  `json:"kind"`
	ID          string  `json:"id"`
	DisplayName *string `json:"display_name,omitempty"`
}

type Authority struct {
	System        string `json:"system"`
	Control       string `json:"control"`
	Authoritative bool   `json:"authoritative"`
}

type Evidence struct {
	Status     EvidenceStatus `json:"status"`
	ObservedAt string         `json:"observed_at"`
	ValidUntil *string        `json:"valid_until,omitempty"`
	Summary    *string        `json:"summary,omitempty"`
	Reference  *string        `json:"reference,omitempty"`
}

type Claim struct {
	ProtectedByWardveil bool `json:"protected_by_wardveil"`
}

type Privacy struct {
	DetailsWithheld bool     `json:"details_withheld"`
	Redactions      []string `json:"redactions"`
}

type StatusRecord struct {
	ContractVersion string    `json:"contract_version"`
	Scope           Scope     `json:"scope"`
	Authority       Authority `json:"authority"`
	State           State     `json:"state"`
	SourceState     *string   `json:"source_state,omitempty"`
	Evidence        Evidence  `json:"evidence"`
	Claim           Claim     `json:"claim"`
	Privacy         Privacy   `json:"privacy"`
}

type Evaluation struct {
	State               State
	Label               string
	ProtectedByWardveil bool
	Reason              string
}

func DecodeStatus(data []byte) (StatusRecord, error) {
	var record StatusRecord
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&record); err != nil {
		return StatusRecord{}, fmt.Errorf("decode Wardveil status: %w", err)
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return StatusRecord{}, errors.New("decode Wardveil status: trailing data")
	}
	if err := ValidateStatus(record); err != nil {
		return StatusRecord{}, err
	}
	return record, nil
}

func ValidateStatus(record StatusRecord) error {
	if record.ContractVersion != ContractVersion {
		return errors.New("unsupported Wardveil status contract version")
	}
	if _, ok := allowedScopeKinds[record.Scope.Kind]; !ok {
		return errors.New("invalid Wardveil scope kind")
	}
	if err := boundedRequired("scope.id", record.Scope.ID, maxScopeValue); err != nil {
		return err
	}
	if record.Scope.DisplayName != nil {
		if err := boundedRequired("scope.display_name", *record.Scope.DisplayName, maxScopeValue); err != nil {
			return err
		}
	}
	if err := boundedRequired("authority.system", record.Authority.System, maxAuthorityValue); err != nil {
		return err
	}
	if err := boundedRequired("authority.control", record.Authority.Control, maxAuthorityValue); err != nil {
		return err
	}
	switch record.State {
	case StateProtected, StateAttention, StateDegraded, StateUnknown, StateNotApplicable:
	default:
		return errors.New("invalid Wardveil state")
	}
	switch record.Evidence.Status {
	case EvidenceCurrent, EvidenceStale, EvidenceUnavailable, EvidenceUnverified:
	default:
		return errors.New("invalid Wardveil evidence status")
	}
	if _, err := time.Parse(time.RFC3339, record.Evidence.ObservedAt); err != nil {
		return errors.New("invalid Wardveil observed_at")
	}
	if record.Evidence.ValidUntil != nil {
		if _, err := time.Parse(time.RFC3339, *record.Evidence.ValidUntil); err != nil {
			return errors.New("invalid Wardveil valid_until")
		}
	}
	if len(stringValue(record.Evidence.Summary)) > maxSummary {
		return errors.New("Wardveil evidence summary too long")
	}
	if len(stringValue(record.Evidence.Reference)) > maxReference {
		return errors.New("Wardveil evidence reference too long")
	}
	if len(record.Privacy.Redactions) > 16 {
		return errors.New("too many Wardveil redactions")
	}
	for _, value := range append([]string{
		stringValue(record.Scope.DisplayName),
		stringValue(record.SourceState),
		stringValue(record.Evidence.Summary),
		stringValue(record.Evidence.Reference),
	}, record.Privacy.Redactions...) {
		if containsSensitiveMarker(value) {
			return errors.New("sensitive Wardveil evidence marker rejected")
		}
	}
	if record.State == StateProtected || record.Claim.ProtectedByWardveil {
		if record.State != StateProtected {
			return errors.New("Protected by Wardveil claim requires protected state")
		}
		if !record.Authority.Authoritative {
			return errors.New("protected Wardveil state requires authoritative producer")
		}
		if record.Evidence.Status != EvidenceCurrent {
			return errors.New("protected Wardveil state requires current evidence")
		}
		if record.Evidence.ValidUntil == nil {
			return errors.New("protected Wardveil state requires valid_until")
		}
	}
	return nil
}

func Evaluate(record StatusRecord, now time.Time) Evaluation {
	if err := ValidateStatus(record); err != nil {
		return unknown("invalid Wardveil status record")
	}
	observedAt, _ := time.Parse(time.RFC3339, record.Evidence.ObservedAt)
	if observedAt.After(now.Add(maxFutureClockSkew)) {
		return unknown("Wardveil evidence observed_at is implausibly in the future")
	}

	switch record.Evidence.Status {
	case EvidenceStale:
		return unknown("Wardveil evidence is stale")
	case EvidenceUnavailable:
		return unknown("Wardveil evidence is unavailable")
	case EvidenceUnverified:
		return unknown("Wardveil evidence is unverified")
	}

	if record.State == StateProtected || record.Claim.ProtectedByWardveil {
		if record.Evidence.ValidUntil == nil {
			return unknown("Wardveil protected evidence has no freshness deadline")
		}
		validUntil, err := time.Parse(time.RFC3339, *record.Evidence.ValidUntil)
		if err != nil || !validUntil.After(now) {
			return unknown("Wardveil protected evidence is expired or malformed")
		}
		return Evaluation{
			State:               StateProtected,
			Label:               Label(StateProtected),
			ProtectedByWardveil: true,
		}
	}

	return Evaluation{
		State:               record.State,
		Label:               Label(record.State),
		ProtectedByWardveil: false,
	}
}

func Label(state State) string {
	switch state {
	case StateProtected:
		return "Protected"
	case StateAttention:
		return "Attention required"
	case StateDegraded:
		return "Degraded"
	case StateNotApplicable:
		return "Not applicable"
	case StateUnknown:
		fallthrough
	default:
		return "Unknown"
	}
}

func unknown(reason string) Evaluation {
	return Evaluation{
		State:               StateUnknown,
		Label:               Label(StateUnknown),
		ProtectedByWardveil: false,
		Reason:              reason,
	}
}

func boundedRequired(name, value string, limit int) error {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > limit {
		return fmt.Errorf("invalid %s", name)
	}
	return nil
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
