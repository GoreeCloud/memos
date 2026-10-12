package v1

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/peer"
)

// Native gRPC can bypass the Echo HTTP boundary. Only verified TLS transport
// credentials, not arbitrary request metadata, can set the Secure cookie flag.
func TestNativeGRPCTLSCookie(t *testing.T) {
	service := &APIV1Service{}
	expiry := time.Date(2030, time.January, 2, 3, 4, 5, 0, time.UTC)

	tlsContext := peer.NewContext(context.Background(), &peer.Peer{
		AuthInfo: credentials.TLSInfo{},
	})
	cookie := service.buildRefreshTokenCookie(tlsContext, "example", expiry)
	require.True(t, containsCookieAttribute(cookie, "Secure"))
	require.True(t, containsCookieAttribute(cookie, "HttpOnly"))
	require.Contains(t, cookie, "SameSite=Lax")

	plainContext := context.Background()
	plain := service.buildRefreshTokenCookie(plainContext, "example", expiry)
	require.False(t, containsCookieAttribute(plain, "Secure"))
	require.True(t, containsCookieAttribute(plain, "HttpOnly"))

	zero := service.buildRefreshTokenCookie(tlsContext, "", time.Time{})
	require.True(t, containsCookieAttribute(zero, "Secure"))
	require.Contains(t, zero, "Expires=Thu, 01 Jan 1970 00:00:00 GMT")
}
