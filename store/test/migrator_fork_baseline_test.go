package test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/usememos/memos/internal/profile"
	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
	storedb "github.com/usememos/memos/store/db"
)

func TestUpgradeFromBaselineRelease(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping container-based upgrade test in short mode")
	}
	skipIfContainerProviderUnavailable(t)

	ctx := context.Background()
	driver := getDriverFromEnv()
	cfg, hostDSN := prepareUpgradeFixture(t, driver, "0.31.0")
	container, err := StartMemosContainer(ctx, cfg)
	require.NoError(t, err)
	t.Cleanup(func() {
		if container != nil {
			_ = container.Terminate(ctx)
		}
	})
	require.NoError(t, container.Terminate(ctx))
	container = nil

	previous := NewTestingStoreWithDSN(ctx, t, driver, hostDSN)
	t.Cleanup(func() { _ = previous.Close() })
	baseline, err := previous.GetInstanceBasicSetting(ctx)
	require.NoError(t, err)
	require.Equal(t, "0.31.8", baseline.SchemaVersion)

	requireUpgradePreservesData(ctx, t, previous, &profile.Profile{
		Data: t.TempDir(), DSN: hostDSN, Driver: driver, Version: "26.10",
	})
}

func requireUpgradePreservesData(ctx context.Context, t *testing.T, previous *store.Store, candidateProfile *profile.Profile) {
	t.Helper()
	user, err := createTestingHostUser(ctx, previous)
	require.NoError(t, err)
	memo, err := previous.CreateMemo(ctx, &store.Memo{
		UID: "upgrade-sentinel", CreatorID: user.ID, Content: "#upgrade\n- [ ] preserved task", Visibility: store.Private, Pinned: true,
	})
	require.NoError(t, err)
	memo, err = previous.GetMemo(ctx, &store.FindMemo{UID: &memo.UID})
	require.NoError(t, err)
	view, err := previous.UpsertUserSetting(ctx, &storepb.UserSetting{
		UserId: user.ID, Key: storepb.UserSetting_MEMO_VIEWS,
		Value: &storepb.UserSetting_MemoViews{MemoViews: &storepb.MemoViewsUserSetting{
			MemoViews: []*storepb.MemoViewsUserSetting_MemoView{{Id: "upgrade", Title: "Upgrade sentinel", Filter: "has_incomplete_tasks"}},
		}},
	})
	require.NoError(t, err)
	access, err := previous.UpsertInstanceSetting(ctx, &storepb.InstanceSetting{
		Key: storepb.InstanceSettingKey_ACCESS,
		Value: &storepb.InstanceSetting_AccessSetting{AccessSetting: &storepb.InstanceAccessSetting{
			AccessMode: storepb.InstanceAccessMode_INSTANCE_ACCESS_MODE_PUBLIC,
		}},
	})
	require.NoError(t, err)
	require.NoError(t, previous.Close())

	verify := func(candidate *store.Store) {
		t.Helper()
		currentSchema, err := candidate.GetCurrentSchemaVersion()
		require.NoError(t, err)
		basic, err := candidate.GetInstanceBasicSetting(ctx)
		require.NoError(t, err)
		require.Equal(t, currentSchema, basic.SchemaVersion)
		preservedUser, err := candidate.GetUser(ctx, &store.FindUser{ID: &user.ID})
		require.NoError(t, err)
		require.Equal(t, user, preservedUser)
		preservedMemo, err := candidate.GetMemo(ctx, &store.FindMemo{UID: &memo.UID})
		require.NoError(t, err)
		require.Equal(t, memo, preservedMemo)
		preservedView, err := candidate.GetUserSetting(ctx, &store.FindUserSetting{UserID: &user.ID, Key: storepb.UserSetting_MEMO_VIEWS})
		require.NoError(t, err)
		require.True(t, proto.Equal(view, preservedView), "saved Views must survive the upgrade")
		preservedAccess, err := candidate.GetInstanceAccessSetting(ctx)
		require.NoError(t, err)
		require.True(t, proto.Equal(access.GetAccessSetting(), preservedAccess), "explicit access mode must not be reset")
	}

	driver, err := storedb.NewDBDriver(candidateProfile)
	require.NoError(t, err)
	candidate := store.New(driver, candidateProfile)
	t.Cleanup(func() { _ = candidate.Close() })
	require.NoError(t, candidate.Migrate(ctx))
	verify(candidate)
	written, err := candidate.CreateMemo(ctx, &store.Memo{
		UID: "after-upgrade", CreatorID: user.ID, Content: "created after upgrade", Visibility: store.Private,
	})
	require.NoError(t, err, "upgraded database must remain writable")
	require.NoError(t, candidate.Close())

	restartedDriver, err := storedb.NewDBDriver(candidateProfile)
	require.NoError(t, err)
	restarted := store.New(restartedDriver, candidateProfile)
	t.Cleanup(func() { _ = restarted.Close() })
	require.NoError(t, restarted.Migrate(ctx), "restart after upgrade must be idempotent")
	verify(restarted)
	persisted, err := restarted.GetMemo(ctx, &store.FindMemo{UID: &written.UID})
	require.NoError(t, err)
	require.NotNil(t, persisted)
	require.Equal(t, written.Content, persisted.Content, "post-upgrade writes must survive restart")
}
