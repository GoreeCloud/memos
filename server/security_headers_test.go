package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v5"
)

func TestSecurityHeadersMiddleware(t *testing.T) {
	e := echo.New()
	e.Use(newSecurityHeadersMiddleware())
	e.GET("/", func(c *echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	expected := map[string]string{
		"Content-Security-Policy": goreeCloudContentSecurityPolicy,
		"Permissions-Policy":      goreeCloudPermissionsPolicy,
		"Referrer-Policy":         "strict-origin-when-cross-origin",
		"X-Content-Type-Options":  "nosniff",
		"X-Frame-Options":         "SAMEORIGIN",
	}
	for name, want := range expected {
		if got := rec.Header().Get(name); got != want {
			t.Fatalf("%s: expected %q, got %q", name, want, got)
		}
	}
}
