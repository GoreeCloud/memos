package test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/fieldmaskpb"

	apiv1 "github.com/usememos/memos/proto/gen/api/v1"
)

func TestMemoCardColorIsAuthorizedAndPersisted(t *testing.T) {
	ctx := context.Background()
	ts := NewTestService(t)
	defer ts.Cleanup()

	owner, err := ts.CreateRegularUser(ctx, "card-color-owner")
	require.NoError(t, err)
	ownerCtx := ts.CreateUserContext(ctx, owner.ID)
	other, err := ts.CreateRegularUser(ctx, "card-color-other")
	require.NoError(t, err)
	otherCtx := ts.CreateUserContext(ctx, other.ID)

	_, err = ts.Service.CreateMemo(ownerCtx, &apiv1.CreateMemoRequest{
		Memo: &apiv1.Memo{Content: "Invalid CSS", CardColor: "url(javascript:alert(1))"},
	})
	require.Equal(t, codes.InvalidArgument, status.Code(err))

	created, err := ts.Service.CreateMemo(ownerCtx, &apiv1.CreateMemoRequest{
		Memo: &apiv1.Memo{Content: "Color survives sync", CardColor: "lavender"},
	})
	require.NoError(t, err)
	require.Equal(t, "lavender", created.CardColor)

	saved, err := ts.Service.GetMemo(ownerCtx, &apiv1.GetMemoRequest{Name: created.Name})
	require.NoError(t, err)
	require.Equal(t, "lavender", saved.CardColor)

	_, err = ts.Service.UpdateMemo(otherCtx, &apiv1.UpdateMemoRequest{
		Memo:       &apiv1.Memo{Name: created.Name, CardColor: "peach"},
		UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"card_color"}},
	})
	require.Equal(t, codes.PermissionDenied, status.Code(err))

	_, err = ts.Service.UpdateMemo(ownerCtx, &apiv1.UpdateMemoRequest{
		Memo:       &apiv1.Memo{Name: created.Name, CardColor: "#eeaa00"},
		UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"card_color"}},
	})
	require.Equal(t, codes.InvalidArgument, status.Code(err))

	changed, err := ts.Service.UpdateMemo(ownerCtx, &apiv1.UpdateMemoRequest{
		Memo:       &apiv1.Memo{Name: created.Name, CardColor: "mint"},
		UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"card_color"}},
	})
	require.NoError(t, err)
	require.Equal(t, "mint", changed.CardColor)

	updated, err := ts.Service.UpdateMemo(ownerCtx, &apiv1.UpdateMemoRequest{
		Memo:       &apiv1.Memo{Name: created.Name, Content: "Content still works"},
		UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"content"}},
	})
	require.NoError(t, err)
	require.Equal(t, "mint", updated.CardColor)

	cleared, err := ts.Service.UpdateMemo(ownerCtx, &apiv1.UpdateMemoRequest{
		Memo:       &apiv1.Memo{Name: created.Name, CardColor: ""},
		UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"card_color"}},
	})
	require.NoError(t, err)
	require.Empty(t, cleared.CardColor)
}
