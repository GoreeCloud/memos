# GoreeCloud Memos — Android development companion

This APK is a thin Android WebView client for a user-supplied **HTTPS Memos instance**, not a locally hosted/offline notes database. On first launch, set the full HTTPS origin (e.g. `https://memos.example.com`). The app does not send notes or credentials to GoreeCloud services independently of the configured Memos instance.

- Android API 26+; signed Dev identifier `com.goreecloud.memos.dev`.
- Uses the system Android WebView with JavaScript and DOM storage enabled.
- No mixed HTTP content, arbitrary cleartext, WebView JavaScript bridges, third-party cookies, app backup, or WebView debugging.
- Uses Android's document picker for upload attachments.
- External HTTPS navigations open in a browser; non-HTTPS top-level navigations are rejected.
- Settings are saved in this app's private Android preferences, and server cookies in Android WebView cookie storage.
- Existing logins do not transfer from your regular mobile browser; authentication must be repeated.
- This preview needs real-device login, file upload, keyboard, screen-reader, back-navigation and offline/error acceptance before stable release.

To build, use Android SDK (API 36, build tools 36), JDK 17, and environment variables `ANDROID_SDK_ROOT`, `MEMOS_ANDROID_KEYSTORE`, and `MEMOS_ANDROID_KEYSTORE_PASSWORD_FILE`, then `bash packaging/android/build-apk.sh`. Keep the signing identity protected and backed up securely outside version control. Use a **strictly greater** `MEMOS_ANDROID_VERSION_CODE` on each distributed update and the **same** signing key. Avoid uninstalling an existing Dev build unless accepting the loss of its local application data.
