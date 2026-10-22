# Genuine native Debian Development preview

This is the **GTK4 native app**, not GoreeCloud's older Linux web/browser
Development bridge at `packaging/linux/`. The package is independently
named `goreecloud-memos-native-preview` to prevent replacement of that
existing application.

## Build, inspect and smoke

On Debian/Ubuntu with GCC, pkg-config, GTK 4.10+, GLib 2.72+,
JSON-GLib 1.6+, `dpkg-deb`, `dpkg-shlibdeps` (from dpkg-dev),
`desktop-file-validate` and Xvfb:

```bash
make -C native/linux-gtk4 all test
bash native/linux-gtk4/packaging/build-deb.sh
bash native/linux-gtk4/packaging/smoke-deb.sh
```

The first script produces
`native/linux-gtk4/dist/goreecloud-memos-native-preview_0.1.0~dev20261021-1_<arch>.deb`.
The second builds it twice with fixed `SOURCE_DATE_EPOCH`, compares archives,
checks package metadata and the .desktop launcher, ensures there are **no
maintainer lifecycle scripts**, unpacks to an isolated temporary directory,
and launches the unpacked ELF under a temporary X server. No system package
installation or privileged operation is needed for the audit.

A **separate short-lived GitHub Actions artifact** is produced by the single
GoreeCloud Validate workflow after these tests pass. Do not confuse this with
the older Linux Development Debian artifact.

## Scope, restrictions and further acceptance

- GTK4 native app (no browser engine, WebView, Electron or PWA wrapper).
- The launcher is clearly labeled **Native Preview** and the app indicates
  that all data is synthetic, in memory only and lost at close.
- No account login, HTTPS transport, real memos, private credentials, network
  communication, file persistence, auto-updates, or data migration.
- No root `postinst`, `preinst`, `prerm`, or `postrm` scripts.
- Built for the host architecture; no cross-architecture claim.
- Package `Depends` versions are computed with `dpkg-shlibdeps` from the
  compiled ELF's actual required library symbols. They are constrained
  to **at least** the documented tested GTK4 4.10 / GLib 2.72 /
  JSON-GLib 1.6 baselines, without lowering newer library requirements.
  The package smoke test also rejects the GTK 4.12-only
  `gtk_css_provider_load_from_string` symbol: the app deliberately uses
  its GTK 4.10-compatible counterpart even when compiled on GTK 4.18.
  CI-built artifacts still require cross-runtime verification; examine
  `dpkg-deb -f path/to/package.deb Depends` before installation and never
  bypass dependency checks.
- This artifact is **unsigned and not a Stable/native-complete distribution**.
  Actual OS package installation, removal and upgrade/rollback, real desktop
  accessibility, HiDPI and user-device acceptance remain outstanding.
- Supported runtime baseline is conservatively stated as GTK4 4.10+ and GLib
  2.72+. Package dependencies must be revisited before declaring broad distro
  support, and test platforms independently.

Never promote or install this candidate on the running Memos Development
server. Follow the project's normal gates for any governed release.
