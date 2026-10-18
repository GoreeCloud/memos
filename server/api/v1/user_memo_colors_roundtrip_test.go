package v1

import (
	"testing"

	v1pb "github.com/usememos/memos/proto/gen/api/v1"
	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
)

func TestMemoColorsSettingsRoundTrip(t *testing.T) {
	original := &v1pb.UserSetting{
		Value: &v1pb.UserSetting_GeneralSetting_{
			GeneralSetting: &v1pb.UserSetting_GeneralSetting{
				MemoColors: map[string]string{"memos/sample": "#DCEEFE"},
			},
		},
	}
	saved, err := convertUserSettingToStore(original, 42, storepb.UserSetting_GENERAL)
	if err != nil {
		t.Fatal(err)
	}
	restored := convertUserSettingFromStore(saved, &store.User{ID: 42, Username: "tester"}, storepb.UserSetting_GENERAL)
	if got := restored.GetGeneralSetting().GetMemoColors()["memos/sample"]; got != "#DCEEFE" {
		t.Fatalf("memo color lost during persistence conversion: %q", got)
	}
}
