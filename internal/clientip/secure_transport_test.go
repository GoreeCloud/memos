package clientip

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v5"
	"github.com/stretchr/testify/require"
)

func TestSecureTransportTrustBoundary(t *testing.T) {
	tests := []struct {
		name     string
		trusted  []string
		remote   string
		directTLS bool
		header   http.Header
		want     bool
	}{
		{name: "direct TLS wins even for untrusted peer", trusted: []string{"none"}, remote: "203.0.113.4:443", directTLS: true, want: true},
		{name: "direct HTTP remains insecure", trusted: []string{"none"}, remote: "203.0.113.4:80"},
		{name: "untrusted peer cannot spoof xfp", trusted: []string{"none"}, remote: "203.0.113.4:80", header: headers("X-Forwarded-Proto", "https")},
		{name: "untrusted peer cannot spoof Forwarded", trusted: []string{"none"}, remote: "203.0.113.4:80", header: headers("Forwarded", "for=198.51.100.4;proto=https")},
		{name: "origin never proves secure transport", remote: "127.0.0.1:80", header: headers("Origin", "https://example.test")},
		{name: "trusted proxy can report HTTPS", trusted: []string{"127.0.0.1/8"}, remote: "127.0.0.1:80", header: headers("X-Forwarded-Proto", "https"), want: true},
		{name: "trusted proxy can report Forwarded HTTPS", trusted: []string{"127.0.0.1/8"}, remote: "127.0.0.1:80", header: headers("Forwarded", "for=198.51.100.4; proto=\"https\""), want: true},
		{name: "trusted proxy reporting HTTP stays insecure", remote: "127.0.0.1:80", header: headers("X-Forwarded-Proto", "http")},
		{name: "injected first HTTPS does not override last HTTP", remote: "127.0.0.1:80", header: headers("X-Forwarded-Proto", "https, http")},
		{name: "rightmost proxy HTTPS wins after earlier HTTP", remote: "127.0.0.1:80", header: headers("X-Forwarded-Proto", "http, https"), want: true},
		{name: "last forwarded element is authoritative", remote: "127.0.0.1:80", header: headers("Forwarded", "for=198.51.100.4;proto=https, for=127.0.0.1;proto=http")},
		{name: "do not match similar Forwarded key", remote: "127.0.0.1:80", header: headers("Forwarded", "for=198.51.100.4;notproto=https")},
		{name: "malformed peer cannot use forwarded headers", remote: "unix", header: headers("X-Forwarded-Proto", "https")},
		{name: "explicit none disables even loopback forwarding", trusted: []string{"none"}, remote: "127.0.0.1:80", header: headers("X-Forwarded-Proto", "https")},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			resolver, err := ParseTrustedProxies(tc.trusted)
			require.NoError(t, err)
			require.Equal(t, tc.want, resolver.SecureTransport(tc.remote, tc.directTLS, tc.header))
		})
	}
}

func TestMiddlewareCarriesVerifiedSecureTransport(t *testing.T) {
	resolver, err := ParseTrustedProxies([]string{"127.0.0.1"})
	require.NoError(t, err)
	e := echo.New()
	e.Use(Middleware(resolver))
	secure := false
	e.GET("/security", func(c *echo.Context) error {
		secure = SecureFromContext(c.Request().Context())
		return nil
	})

	cases := []struct {
		name   string
		remote string
		tls    bool
		xfp    string
		want   bool
	}{
		{name: "local HTTP", remote: "127.0.0.1:80"},
		{name: "trusted forwarded TLS", remote: "127.0.0.1:80", xfp: "https", want: true},
		{name: "untrusted forwarded spoof", remote: "203.0.113.1:80", xfp: "https"},
		{name: "direct TLS", remote: "203.0.113.1:443", tls: true, want: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "http://example.test/security", nil)
			req.RemoteAddr = tc.remote
			if tc.tls {
				req.TLS = &tls.ConnectionState{}
			}
			if tc.xfp != "" {
				req.Header.Set("X-Forwarded-Proto", tc.xfp)
			}
			e.ServeHTTP(httptest.NewRecorder(), req)
			require.Equal(t, tc.want, secure)
		})
	}
}
