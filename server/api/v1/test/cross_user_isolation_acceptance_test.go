package test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/fieldmaskpb"

	apiv1 "github.com/usememos/memos/proto/gen/api/v1"
)

func TestCrossUserCoreIsolationAcceptance(t *testing.T) {
	ctx := context.Background()
	ts := NewTestService(t)
	defer ts.Cleanup()

	owner, err := ts.CreateRegularUser(ctx, "isolation-owner")
	require.NoError(t, err)
	other, err := ts.CreateRegularUser(ctx, "isolation-other")
	require.NoError(t, err)
	ownerCtx := ts.CreateUserContext(ctx, owner.ID)
	otherCtx := ts.CreateUserContext(ctx, other.ID)

	attachment, err := ts.Service.CreateAttachment(ownerCtx, &apiv1.CreateAttachmentRequest{
		Attachment: &apiv1.Attachment{
			Filename: "private.txt",
			Type:     "text/plain",
			Content:  []byte("owner-only attachment"),
		},
	})
	require.NoError(t, err)

	memo, err := ts.Service.CreateMemo(ownerCtx, &apiv1.CreateMemoRequest{
		Memo: &apiv1.Memo{
			Content:     "owner-only memo",
			Visibility:  apiv1.Visibility_PRIVATE,
			Attachments: []*apiv1.Attachment{{Name: attachment.Name}},
		},
	})
	require.NoError(t, err)

	view, err := ts.Service.CreateMemoView(ownerCtx, &apiv1.CreateMemoViewRequest{
		Parent: fmt.Sprintf("users/%s", owner.Username),
		MemoView: &apiv1.MemoView{
			Title:  "Owner private view",
			Filter: "visibility == \"PRIVATE\"",
		},
	})
	require.NoError(t, err)

	t.Run("private memo read is denied", func(t *testing.T) {
		_, err := ts.Service.GetMemo(otherCtx, &apiv1.GetMemoRequest{Name: memo.Name})
		require.Equal(t, codes.PermissionDenied, status.Code(err))
	})

	t.Run("private memo stays out of other users collection", func(t *testing.T) {
		resp, err := ts.Service.ListMemos(otherCtx, &apiv1.ListMemosRequest{PageSize: 50})
		require.NoError(t, err)
		for _, candidate := range resp.Memos {
			require.NotEqual(t, memo.Name, candidate.Name)
		}
	})

	t.Run("private memo mutation and deletion are denied", func(t *testing.T) {
		_, err := ts.Service.UpdateMemo(otherCtx, &apiv1.UpdateMemoRequest{
			Memo:       &apiv1.Memo{Name: memo.Name, Content: "cross-user overwrite"},
			UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"content"}},
		})
		require.Equal(t, codes.PermissionDenied, status.Code(err))

		_, err = ts.Service.DeleteMemo(otherCtx, &apiv1.DeleteMemoRequest{Name: memo.Name})
		require.Equal(t, codes.PermissionDenied, status.Code(err))
	})

	t.Run("attachment metadata and memo attachment mutation are denied", func(t *testing.T) {
		_, err := ts.Service.GetAttachment(otherCtx, &apiv1.GetAttachmentRequest{Name: attachment.Name})
		require.Equal(t, codes.PermissionDenied, status.Code(err))

		_, err = ts.Service.SetMemoAttachments(otherCtx, &apiv1.SetMemoAttachmentsRequest{
			Name:        memo.Name,
			Attachments: []*apiv1.Attachment{},
		})
		require.Equal(t, codes.PermissionDenied, status.Code(err))
	})

	t.Run("personal export is denied", func(t *testing.T) {
		_, err := ts.Service.ExportMemos(otherCtx, &apiv1.ExportMemosRequest{Name: userName(owner)})
		require.Equal(t, codes.PermissionDenied, status.Code(err))
	})

	t.Run("saved view read is denied", func(t *testing.T) {
		_, err := ts.Service.GetMemoView(otherCtx, &apiv1.GetMemoViewRequest{Name: view.Name})
		require.Equal(t, codes.PermissionDenied, status.Code(err))
	})

	t.Run("owner data remains intact after denied operations", func(t *testing.T) {
		got, err := ts.Service.GetMemo(ownerCtx, &apiv1.GetMemoRequest{Name: memo.Name})
		require.NoError(t, err)
		require.Equal(t, "owner-only memo", got.Content)
		require.Len(t, got.Attachments, 1)
		require.Equal(t, attachment.Name, got.Attachments[0].Name)

		gotView, err := ts.Service.GetMemoView(ownerCtx, &apiv1.GetMemoViewRequest{Name: view.Name})
		require.NoError(t, err)
		require.Equal(t, "Owner private view", gotView.Title)
	})
}
