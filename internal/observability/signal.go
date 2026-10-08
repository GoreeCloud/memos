package observability

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	ComponentID     = "goreecloud-memos"
	SourceID        = "goreecloud-memos"
	DefaultTTL      = 60
	maxTTLSeconds   = 86400
	maxIdentifier   = 240
	maxSignalType   = 160
	maxAttributeKey = 160
)

type State string

const (
	StateHealthy           State = "healthy"
	StateDegraded          State = "degraded"
	StateFailed            State = "failed"
	StateUnavailable       State = "unavailable"
	StateUnknown           State = "unknown"
	StateStale             State = "stale"
	StatePartiallyObserved State = "partially_observed"
	StateNotMonitored      State = "not_monitored"
	StateNotApplicable     State = "not_applicable"
)

var allowedStates = map[State]struct{}{
	StateHealthy:           {},
	StateDegraded:          {},
	StateFailed:            {},
	StateUnavailable:       {},
	StateUnknown:           {},
	StateStale:             {},
	StatePartiallyObserved: {},
	StateNotMonitored:      {},
	StateNotApplicable:     {},
}

var sensitiveAttributeMarkers = []string{
	"password",
	"passwd",
	"token",
	"secret",
	"authorization",
	"cookie",
	"api_key",
	"apikey",
	"private_key",
	"privatekey",
	"credential",
}

type Signal struct {
	SignalID       string         `json:"signal_id"`
	ComponentID    string         `json:"component_id"`
	Source         string         `json:"source"`
	SignalType     string         `json:"signal_type"`
	State          State          `json:"state"`
	ObservedAt     string         `json:"observed_at"`
	CollectedAt    string         `json:"collected_at"`
	TTLSeconds     int            `json:"ttl_seconds"`
	CorrelationID  *string        `json:"correlation_id,omitempty"`
	Attributes     map[string]any `json:"attributes,omitempty"`
	CollectionGaps []string       `json:"collection_gaps,omitempty"`
}

type Pinger interface {
	PingContext(context.Context) error
}

func BuildProcessLivenessSignal(now time.Time) Signal {
	return newSignal("process.liveness", StateHealthy, now, nil)
}

func BuildDatabaseReadinessSignal(ctx context.Context, database Pinger, now time.Time) Signal {
	if database == nil {
		return newSignal("database.readiness", StateUnknown, now, []string{"database_handle_missing"})
	}
	if err := database.PingContext(ctx); err != nil {
		return newSignal("database.readiness", StateUnavailable, now, []string{"database_ping_failed"})
	}
	return newSignal("database.readiness", StateHealthy, now, nil)
}

func ValidateSignal(signal Signal) error {
	if err := validateIdentifier("signal_id", signal.SignalID, maxIdentifier); err != nil {
		return err
	}
	if signal.ComponentID != ComponentID {
		return errors.New("component_id must identify GoreeCloud Memos")
	}
	if signal.Source != SourceID {
		return errors.New("source must identify GoreeCloud Memos")
	}
	if err := validateIdentifier("signal_type", signal.SignalType, maxSignalType); err != nil {
		return err
	}
	if _, ok := allowedStates[signal.State]; !ok {
		return errors.New("invalid state")
	}
	observed, err := time.Parse(time.RFC3339Nano, signal.ObservedAt)
	if err != nil {
		return errors.New("invalid observed_at")
	}
	collected, err := time.Parse(time.RFC3339Nano, signal.CollectedAt)
	if err != nil {
		return errors.New("invalid collected_at")
	}
	if collected.Before(observed) {
		return errors.New("collected_at cannot precede observed_at")
	}
	if signal.TTLSeconds < 1 || signal.TTLSeconds > maxTTLSeconds {
		return errors.New("ttl_seconds outside contract range")
	}
	for key := range signal.Attributes {
		if len(key) == 0 || len(key) > maxAttributeKey {
			return errors.New("invalid attribute key")
		}
		normalized := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(key, "-", "_"), " ", "_"))
		for _, marker := range sensitiveAttributeMarkers {
			if strings.Contains(normalized, marker) {
				return errors.New("sensitive telemetry attribute key rejected")
			}
		}
	}
	for _, gap := range signal.CollectionGaps {
		if strings.TrimSpace(gap) == "" || len(gap) > maxIdentifier {
			return errors.New("invalid collection gap")
		}
	}
	return nil
}

func newSignal(signalType string, state State, now time.Time, gaps []string) Signal {
	now = now.UTC()
	timestamp := now.Format(time.RFC3339Nano)
	signalID := fmt.Sprintf("%s:%s:%d", ComponentID, strings.ReplaceAll(signalType, ".", "-"), now.UnixNano())
	return Signal{
		SignalID:       signalID,
		ComponentID:    ComponentID,
		Source:         SourceID,
		SignalType:     signalType,
		State:          state,
		ObservedAt:     timestamp,
		CollectedAt:    timestamp,
		TTLSeconds:     DefaultTTL,
		CollectionGaps: gaps,
	}
}

func validateIdentifier(name, value string, max int) error {
	if strings.TrimSpace(value) == "" || len(value) > max {
		return fmt.Errorf("invalid %s", name)
	}
	return nil
}
