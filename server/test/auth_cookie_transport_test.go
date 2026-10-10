package test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/require"

	v1pb "github.com/usememos/memos/proto/gen/api/v1"
	"github.com/usememos/memos/proto/gen/api/v1/apiv1connect"
)

func TestRefreshCookieSecureTransportTrustBoundary(t *testing.T) {
	t.Run("gateway trusts HTTPS forwarding from configured proxy", func(t *testing.T) {
		inst := bootInstance(context.Background(), t, instanceOptions{instanceURL: "http://localhost"})
		inst.createAdmin(t)

		resp := gatewayPasswordSignIn(t, inst, http.Header{"X-Forwarded-Proto": []string{"https"}})
		defer resp.Body.Close()
		require.True(t, setCookieHasAttribute(resp.Header.Values("Set-Cookie"), "Secure"))
	})

	t.Run("gateway ignores HTTPS forwarding from untrusted peer", func(t *testing.T) {
		inst := bootInstance(context.Background(), t, instanceOptions{
			instanceURL:    "http://localhost",
			trustedProxies: []string{"none"},
		})
		inst.createAdmin(t)

		headers := http.Header{}
		headers.Set("X-Forwarded-Proto", "https")
		headers.Set("Forwarded", "for=203.0.113.10;proto=https")
		headers.Set("Origin", "https://memos.example")
		resp := gatewayPasswordSignIn(t, inst, headers)
		defer resp.Body.Close()
		require.False(t, setCookieHasAttribute(resp.Header.Values("Set-Cookie"), "Secure"))
	})

	t.Run("gateway does not treat Origin as a transport signal", func(t *testing.T) {
		inst := bootInstance(context.Background(), t, instanceOptions{instanceURL: "http://localhost"})
		inst.createAdmin(t)

		resp := gatewayPasswordSignIn(t, inst, http.Header{"Origin": []string{"https://memos.example"}})
		defer resp.Body.Close()
		require.False(t, setCookieHasAttribute(resp.Header.Values("Set-Cookie"), "Secure"))
	})

	t.Run("gateway rotation preserves Secure behind trusted proxy", func(t *testing.T) {
		inst := bootInstance(context.Background(), t, instanceOptions{instanceURL: "http://localhost"})
		inst.createAdmin(t)

		signIn := gatewayPasswordSignIn(t, inst, http.Header{"X-Forwarded-Proto": []string{"https"}})
		var refreshCookie *http.Cookie
		for _, cookie := range signIn.Cookies() {
			if cookie.Name == "memos_refresh" {
				refreshCookie = cookie
				break
			}
		}
		signIn.Body.Close()
		require.NotNil(t, refreshCookie)

		req, err := http.NewRequestWithContext(
			context.Background(),
			http.MethodPost,
			inst.baseURL+"/api/v1/auth/refresh",
			bytes.NewReader([]byte("{}")),
		)
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Forwarded-Proto", "https")
		req.AddCookie(refreshCookie)

		resp, err := inst.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode)
		require.True(t, setCookieHasAttribute(resp.Header.Values("Set-Cookie"), "Secure"))
	})

	t.Run("connect trusts HTTPS forwarding from configured proxy", func(t *testing.T) {
		inst := bootInstance(context.Background(), t, instanceOptions{instanceURL: "http://localhost"})
		inst.createAdmin(t)

		client := apiv1connect.NewAuthServiceClient(inst.client, inst.baseURL)
		req := connect.NewRequest(passwordSignInRequest())
		req.Header().Set("X-Forwarded-Proto", "https")
		resp, err := client.SignIn(context.Background(), req)
		require.NoError(t, err)
		require.True(t, setCookieHasAttribute(resp.Header().Values("Set-Cookie"), "Secure"))
	})

	t.Run("connect ignores HTTPS forwarding from untrusted peer", func(t *testing.T) {
		inst := bootInstance(context.Background(), t, instanceOptions{
			instanceURL:    "http://localhost",
			trustedProxies: []string{"none"},
		})
		inst.createAdmin(t)

		client := apiv1connect.NewAuthServiceClient(inst.client, inst.baseURL)
		req := connect.NewRequest(passwordSignInRequest())
		req.Header().Set("X-Forwarded-Proto", "https")
		req.Header().Set("Forwarded", "for=203.0.113.10;proto=https")
		resp, err := client.SignIn(context.Background(), req)
		require.NoError(t, err)
		require.False(t, setCookieHasAttribute(resp.Header().Values("Set-Cookie"), "Secure"))
	})
}

func gatewayPasswordSignIn(t *testing.T, inst *instance, headers http.Header) *http.Response {
	t.Helper()

	body, err := json.Marshal(map[string]any{
		"passwordCredentials": map[string]any{
			"username": testAdminUsername,
			"password": testAdminPassword,
		},
	})
	require.NoError(t, err)

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, inst.baseURL+"/api/v1/auth/signin", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	for key, values := range headers {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	resp, err := inst.client.Do(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	return resp
}

func passwordSignInRequest() *v1pb.SignInRequest {
	return &v1pb.SignInRequest{
		Credentials: &v1pb.SignInRequest_PasswordCredentials_{
			PasswordCredentials: &v1pb.SignInRequest_PasswordCredentials{
				Username: testAdminUsername,
				Password: testAdminPassword,
			},
		},
	}
}

func setCookieHasAttribute(values []string, attr string) bool {
	for _, cookie := range values {
		for part := range strings.SplitSeq(cookie, ";") {
			if strings.EqualFold(strings.TrimSpace(part), attr) {
				return true
			}
		}
	}
	return false
}
