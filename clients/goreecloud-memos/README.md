# GoreeCloud Memos Clients

This directory contains the first-party GoreeCloud Memos Linux desktop and Android client shell.

## Role

The client provides a native application container for the existing self-hosted GoreeCloud Memos service at `https://memos.goreecloud.com`.

It intentionally does **not** create a second memo database, duplicate sync engine, or separate authentication model. The web application and the Linux/Android clients use the same GoreeCloud Memos server as their source of truth.

## Architecture

- Framework: Tauri 2
- Current client acceptance candidate: `0.1.4`
- Linux target: AppImage and Debian package
- Android target: APK
- Application identifier: `com.goreecloud.memos`
- Remote application origin: `https://memos.goreecloud.com`
- Native IPC exposed to remote content: none
- Allowed top-level navigation: the canonical GoreeCloud Memos HTTPS origin only, plus `about:blank`
- New webview windows: denied by the native shell

The native shell is deliberately small. Product UI, Glaze UI behavior, authentication, memo editing, labels, archive/trash behavior, Wardveil Security presentation, and server communication remain in the maintained GoreeCloud Memos web application.

Because the shell loads the canonical live service, a client APK can be newer than the web runtime it displays. Device acceptance must therefore verify both the installed native client version and the GoreeCloud Memos build identity shown by the web application.

## Product icon

`../../web/public/goreecloud-memos.svg` is the canonical GoreeCloud Memos application icon source for every client surface.

- Web uses the SVG directly as the primary favicon and committed raster derivatives for browser/PWA and Apple touch-icon compatibility.
- Linux packaging runs Tauri's pinned `icon` command from that same SVG before creating AppImage and Debian bundles.
- Android runs Tauri's pinned `icon` command after Android project initialization so launcher resources are generated from the same SVG rather than a framework or platform default.
- Client CI fails if the expected Linux icon outputs or Android launcher resources are not generated.
- Frontend identity regression coverage verifies that web/PWA and native packaging remain anchored to this canonical source.

The icon is intentionally text-free and uses the Memos quick-capture document motif with GoreeCloud Glaze UI geometry and blue surface semantics. Platform launchers may apply their own icon mask, but the product symbol and source identity remain the same.

The `0.1.4` acceptance candidate refreshes the native package identity for the current post-`v0.1.3` source line so newly built Debian and Android packages can be distinguished from the earlier `0.1.3` acceptance artifacts. The package refresh includes current main source provenance, but because the native shell loads the live service, post-`v0.1.3` web changes such as responsive Home masonry appear in the client only after a separately controlled web/server release and deployment. If a launcher continues to show a cached older icon after updating, uninstalling the prior debug/acceptance build before reinstalling is an acceptable test-only cache reset.

## Linux package metadata

Linux installer/catalog presentation is part of the same application-identity contract as the installed launcher.

- `src-tauri/linux/com.goreecloud.memos.metainfo.xml` is the first-party AppStream component metadata for GoreeCloud Memos.
- Debian and AppImage bundles include that metadata at `/usr/share/metainfo/com.goreecloud.memos.metainfo.xml`.
- The AppStream component declares the canonical `com.goreecloud.memos` identity, MIT project license, GoreeCloud developer identity, canonical homepage, desktop launchable, canonical installed icon name, Office classification, content rating, and release information.
- Tauri bundle metadata explicitly declares GoreeCloud as publisher, `https://memos.goreecloud.com` as homepage, and MIT as the package license while bundling the repository license text.
- Linux CI validates the generated `.deb` with `appstreamcli`, inspects the Debian control fields, confirms the AppStream release version matches the native client version, verifies the desktop entry points to `goreecloud-memos-client`, and requires nonempty installed hicolor icon resources.

This prevents a software center from silently presenting a stale framework/default identity while the installed launcher uses a different GoreeCloud Memos identity.

## Package provenance and integrity

Every current acceptance artifact is tied to one exact checked-out source revision.

- CI verifies that Cargo, Tauri, and AppStream report the same native client version before packaging.
- Pull-request client builds explicitly check out the pull-request head revision rather than relying on an implicit merge-ref checkout.
- The Debian package is inspected after build and must report the expected package version, GoreeCloud maintainer identity, canonical homepage, current AppStream release, desktop identity, and installed icon resources.
- The Android APK is inspected after build with Android package tooling and must report application ID `com.goreecloud.memos` and the expected native client version.
- Linux and Android uploads are staged into self-contained artifact directories with extraction-root-verifiable SHA-256 manifests.
- Each artifact directory includes a provenance record containing the exact source SHA, client version, application identifier, workflow/run identity, and artifact role.
- The canonical GoreeCloud Memos SVG is included with its own SHA-256 record so package acceptance can be tied back to the exact product identity source used by CI.

These checks make a stale Debian or Android package fail closed instead of being published under a current artifact name.

## Security boundary

The client is a constrained presentation shell, not a privileged native extension of the web application.

- It allows top-level navigation only to `https://memos.goreecloud.com` and `about:blank`.
- HTTP downgrade, look-alike hosts, and unrelated origins are rejected by native navigation tests.
- New webview windows are denied instead of silently creating an unrestricted secondary browser surface.
- No native IPC command is intentionally exposed to the remote Memos application.
- The same GoreeCloud Memos authentication, authorization, data-protection, Glaze UI, and Wardveil Security controls remain authoritative.

## Current release boundary

- The client requires network access to the GoreeCloud Memos service.
- When the service is private through GoreeCloud networking, the device must already have the required NetBird/private-DNS access.
- External links that request a new browser window are currently denied by the shell rather than handed off to the platform browser.
- Offline drafts and native share-sheet capture are not part of this thin-shell client role.
- Android CI creates a debug APK for direct device acceptance. Stable Android distribution requires a protected GoreeCloud signing key supplied through repository secrets; keystore material and passwords must never be committed to source control.
- Linux and Android acceptance artifacts include SHA-256 checksum manifests, exact-source provenance, plus the SHA-256 of the canonical icon source used by the packaging workflow.

## Linux development and build

Install the current Tauri Linux prerequisites for your distribution, then run from this directory:

```bash
cargo install tauri-cli --version 2.11.4 --locked
cargo tauri icon ../../web/public/goreecloud-memos.svg
cargo test --manifest-path src-tauri/Cargo.toml
cargo tauri build --bundles appimage,deb
```

Expected bundles are written beneath:

```text
src-tauri/target/release/bundle/appimage/
src-tauri/target/release/bundle/deb/
```

For a Debian acceptance build, validate the generated AppStream metadata with the distribution `appstreamcli` tool before release.

## Android development and build

Configure the Android SDK, NDK, Java, and Rust Android target first. Then run:

```bash
cargo install tauri-cli --version 2.11.4 --locked
cargo tauri android init --ci --skip-targets-install
cargo tauri icon ../../web/public/goreecloud-memos.svg
cargo tauri android build --debug --apk --target aarch64
```

The generated Android project is intentionally not committed. Tauri recreates it from the controlled Rust/configuration source, and CI uploads the resulting APK as a workflow artifact.

## Device acceptance

For an Android acceptance pass, verify at minimum:

- The APK installs and launches as GoreeCloud Memos.
- The launcher uses the canonical GoreeCloud Memos icon.
- Sign-in, memo feed, drawer navigation, search, attachments, settings, Archive, and Trash render correctly.
- The Wardveil Security account group is readable and correctly scoped to evidenced protections.
- The About surface reports the expected deployed GoreeCloud Memos build identity.
- Draft labels and Trash `Delete all` are visible when the deployed server version contains those features.
- Phone typography and touch targets are comfortable without system-level display scaling workarounds.
- Keyboard resizing, Android Back behavior, lifecycle resume, attachment opening/downloading, and external-link handling are checked before Stable release approval.

For Linux acceptance, verify at minimum:

- Opening the local `.deb` before installation shows the current GoreeCloud Memos product identity rather than a stale/default icon.
- The installer reports the MIT license, GoreeCloud publisher/developer identity, homepage, current version, and release details from packaged metadata where the desktop software center exposes those fields.
- The installed launcher and application window use the same canonical Memos icon.
- AppImage behavior, core quick-capture workflows, Wardveil account group, resize behavior, keyboard/pointer accessibility, and package checksum are correct before Stable approval.

## Validation

The `GoreeCloud Memos Clients` GitHub Actions workflow performs:

- Exact-source checkout and client-version contract validation.
- Native desktop/Android icon generation from the canonical GoreeCloud Memos SVG.
- Fail-closed verification that expected Linux and Android launcher resources were generated.
- Rust unit tests for the client navigation boundary.
- Linux AppImage and Debian package builds on Ubuntu 22.04.
- Debian control/AppStream/desktop/icon package inspection and AppStream validation.
- Android target initialization.
- Android ARM64 debug APK build for direct device testing.
- Android package ID/version inspection before upload.
- Extraction-root-relative SHA-256 checksum generation for packaged artifacts and the canonical icon source.
- Exact-source build-provenance generation.
- Artifact upload for both platforms.
