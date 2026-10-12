// Package clientip resolves the client address of a request from the
// connection peer and, only when that peer is a trusted proxy, from the
// forwarding headers it set. Every rate limit and session record keys on the
// value this package produces, so a client can never choose its own address
// by sending a header.
package clientip

import (
	"context"
	"net"
	"net/http"
	"net/netip"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/pkg/errors"
)

// KeywordPrivate expands to the loopback, RFC 1918, link-local, and
// unique-local ranges, which covers a reverse proxy on the same host or on a
// container network. It is the default because that is how most instances
// are deployed, and a default of "none" would put every user behind such a
// proxy into one shared bucket. The trade is that any peer on the private
// network is believed when it forwards an address; an operator whose
// instance is reached directly through a NAT hop that presents a private
// peer address without rewriting headers should set "none" or list the
// real proxy explicitly.
const KeywordPrivate = "private"

// KeywordNone trusts no proxy at all: the peer address is always the client.
const KeywordNone = "none"

var privatePrefixes = []netip.Prefix{
	netip.MustParsePrefix("127.0.0.0/8"),
	netip.MustParsePrefix("::1/128"),
	netip.MustParsePrefix("10.0.0.0/8"),
	netip.MustParsePrefix("172.16.0.0/12"),
	netip.MustParsePrefix("192.168.0.0/16"),
	netip.MustParsePrefix("169.254.0.0/16"),
	netip.MustParsePrefix("fc00::/7"),
	netip.MustParsePrefix("fe80::/10"),
}

// Resolver decides which address identifies the client of a request.
type Resolver struct {
	trusted []netip.Prefix
}

// ParseTrustedProxies turns the configured list into a resolver. Each entry
// is a CIDR, a single address, or one of the keywords. An empty list means
// "private". Entries may themselves be comma-separated.
func ParseTrustedProxies(values []string) (*Resolver, error) {
	entries := []string{}
	for _, value := range values {
		for entry := range strings.SplitSeq(value, ",") {
			if entry = strings.TrimSpace(entry); entry != "" {
				entries = append(entries, entry)
			}
		}
	}
	if len(entries) == 0 {
		entries = []string{KeywordPrivate}
	}

	resolver := &Resolver{}
	for _, entry := range entries {
		switch strings.ToLower(entry) {
		case KeywordPrivate:
			resolver.trusted = append(resolver.trusted, privatePrefixes...)
		case KeywordNone:
			// Trust nothing; other entries still apply if listed.
		default:
			if prefix, err := netip.ParsePrefix(entry); err == nil {
				resolver.trusted = append(resolver.trusted, prefix)
				continue
			}
			addr, err := netip.ParseAddr(entry)
			if err != nil {
				return nil, errors.Errorf("invalid trusted proxy %q: expected a CIDR, an IP address, %q, or %q", entry, KeywordPrivate, KeywordNone)
			}
			resolver.trusted = append(resolver.trusted, netip.PrefixFrom(addr, addr.BitLen()))
		}
	}
	return resolver, nil
}

// Trusts reports whether addr is a configured proxy.
func (r *Resolver) Trusts(addr netip.Addr) bool {
	addr = addr.Unmap()
	for _, prefix := range r.trusted {
		if prefix.Contains(addr) {
			return true
		}
	}
	return false
}

// Resolve returns the client address for a request with the given peer
// address (host:port or bare host) and headers. It always returns a usable
// string: an unparseable peer is returned as-is so that the limiter still
// has a key.
func (r *Resolver) Resolve(remoteAddr string, header http.Header) string {
	peer, ok := parseAddr(remoteAddr)
	if !ok {
		return strings.TrimSpace(remoteAddr)
	}
	if !r.Trusts(peer) {
		return peer.String()
	}

	// Walk X-Forwarded-For from the right: the rightmost entry was appended by
	// the nearest proxy. Skip entries that are themselves trusted proxies; the
	// first untrusted one is the client.
	entries := []string{}
	for _, value := range header.Values("X-Forwarded-For") {
		for entry := range strings.SplitSeq(value, ",") {
			if entry = strings.TrimSpace(entry); entry != "" {
				entries = append(entries, entry)
			}
		}
	}
	for i := len(entries) - 1; i >= 0; i-- {
		candidate, ok := parseAddr(entries[i])
		if !ok {
			// A malformed entry ends the walk; nothing to its left can be trusted.
			break
		}
		if r.Trusts(candidate) {
			continue
		}
		return candidate.String()
	}

	if realIP, ok := parseAddr(header.Get("X-Real-Ip")); ok && !r.Trusts(realIP) {
		return realIP.String()
	}
	return peer.String()
}

func parseAddr(value string) (netip.Addr, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return netip.Addr{}, false
	}
	if host, _, err := net.SplitHostPort(value); err == nil {
		value = host
	}
	value = strings.Trim(value, "[]")
	addr, err := netip.ParseAddr(value)
	if err != nil {
		return netip.Addr{}, false
	}
	return addr.Unmap(), true
}

// SecureTransport decides whether a request reached the application over an
// authenticated TLS connection or through an explicitly trusted TLS-terminating
// proxy. Origin is deliberately ignored: it is chosen by the client.
// When multiple forwarding values exist, only the closest proxy's last value
// is authoritative, preventing an earlier injected "https" from winning.
func (r *Resolver) SecureTransport(remoteAddr string, directTLS bool, header http.Header) bool {
	if directTLS {
		return true
	}
	peer, ok := parseAddr(remoteAddr)
	if !ok || !r.Trusts(peer) {
		return false
	}

	if values := header.Values("X-Forwarded-Proto"); len(values) > 0 {
		parts := strings.Split(values[len(values)-1], ",")
		return strings.EqualFold(strings.TrimSpace(parts[len(parts)-1]), "https")
	}

	if values := header.Values("Forwarded"); len(values) > 0 {
		elements := strings.Split(values[len(values)-1], ",")
		closest := elements[len(elements)-1]
		for _, attribute := range strings.Split(closest, ";") {
			key, value, found := strings.Cut(strings.TrimSpace(attribute), "=")
			if found && strings.EqualFold(strings.TrimSpace(key), "proto") {
				scheme := strings.Trim(strings.TrimSpace(value), "\"")
				return strings.EqualFold(scheme, "https")
			}
		}
	}
	return false
}

type secureTransportKey struct{}

// SecureFromContext is the verified request scheme set by the HTTP boundary.
// No forwarding header or Origin metadata can override it in API services.
func SecureFromContext(ctx context.Context) bool {
	value, _ := ctx.Value(secureTransportKey{}).(bool)
	return value
}

type contextKey struct{}

// WithClientIP stores the resolved client address in ctx.
func WithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, contextKey{}, ip)
}

// FromContext returns the client address stored by the middleware, or "" when
// the request did not pass through it.
func FromContext(ctx context.Context) string {
	if value, ok := ctx.Value(contextKey{}).(string); ok {
		return value
	}
	return ""
}

// Middleware resolves the client address once per request and stores it in
// the request context, where both API transports and the file server read it.
func Middleware(resolver *Resolver) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			request := c.Request()
			ip := resolver.Resolve(request.RemoteAddr, request.Header)
			secure := resolver.SecureTransport(request.RemoteAddr, request.TLS != nil, request.Header)
			ctx := WithClientIP(request.Context(), ip)
			ctx = context.WithValue(ctx, secureTransportKey{}, secure)
			c.SetRequest(request.WithContext(ctx))
			return next(c)
		}
	}
}
