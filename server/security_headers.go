package server

import "github.com/labstack/echo/v5"

const (
	goreeCloudContentSecurityPolicy = "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'"
	goreeCloudPermissionsPolicy     = "accelerometer=(), camera=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()"
)

// newSecurityHeadersMiddleware applies a conservative browser security baseline.
//
// The Content Security Policy deliberately protects document-level trust
// boundaries without constraining script, style, image, media, frame, or
// connection sources yet. Memos supports user-authored embeds, remote media,
// maps, and optional providers; those source directives need product-local
// compatibility testing before they can be tightened safely.
func newSecurityHeadersMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			headers := c.Response().Header()
			headers.Set("Content-Security-Policy", goreeCloudContentSecurityPolicy)
			headers.Set("Permissions-Policy", goreeCloudPermissionsPolicy)
			headers.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			headers.Set("X-Content-Type-Options", "nosniff")
			headers.Set("X-Frame-Options", "SAMEORIGIN")
			return next(c)
		}
	}
}
