import { DirectionProvider } from "@base-ui/react/direction-provider";
import { useEffect } from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { useInstance } from "./contexts/InstanceContext";
import useNavigateTo from "./hooks/useNavigateTo";
import { useUserLocale } from "./hooks/useUserLocale";
import { useUserTheme } from "./hooks/useUserTheme";
import { cleanupExpiredOAuthState } from "./utils/oauth";

const App = () => {
  const navigateTo = useNavigateTo();
  const { profile: instanceProfile, profileLoaded, generalSetting: instanceGeneralSetting } = useInstance();

  // Apply user preferences reactively
  const direction = useUserLocale();
  useUserTheme();

  // Clean up expired OAuth states on app initialization
  useEffect(() => {
    cleanupExpiredOAuthState();
  }, []);

  // Redirect to sign up page if the instance needs initial setup (no users yet).
  // needsSetup is used instead of a missing admin so an instance that has lost its
  // admins isn't mistaken for a fresh install (which would create a normal user).
  // Guard with profileLoaded so a fetch failure doesn't incorrectly trigger the redirect.
  useEffect(() => {
    if (profileLoaded && instanceProfile.needsSetup) {
      navigateTo("/auth/signup");
    }
  }, [profileLoaded, instanceProfile.needsSetup, navigateTo]);

  // GoreeCloud does not execute instance-provided CSS or JavaScript in the
  // trusted application shell. Branding and presentation remain constrained to
  // reviewed product settings and the Glaze design authority.

  // GoreeCloud security boundary: instance-provided JavaScript is intentionally
  // not executed by the browser client. Administrative customization must not
  // silently expand into an arbitrary client-side code-execution channel.

  // Dynamic update metadata with customized profile
  useEffect(() => {
    if (!instanceGeneralSetting.customProfile) {
      return;
    }

    document.title = instanceGeneralSetting.customProfile.title;
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    link.href = instanceGeneralSetting.customProfile.logoUrl || "/goreecloud-memos.svg";
  }, [instanceGeneralSetting.customProfile]);

  return (
    <DirectionProvider direction={direction}>
      <Outlet />
      <ScrollRestoration />
    </DirectionProvider>
  );
};

export default App;
