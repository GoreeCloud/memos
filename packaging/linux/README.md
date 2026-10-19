# GoreeCloud Memos — Linux desktop development package

The Development .deb installs a **local-only** Memos server and a desktop
launcher, not an Electron or GTK-native client. The normal browser handles all
sign-in and interaction. It does not automatically connect to a VPS or to an
independently running portable preview.

## Choose the intended instance

Launching **GoreeCloud Memos** from the desktop opens a terminal with two
explicit choices:

- **Connect to an existing Memos server.** Enter the server's own HTTPS URL
  (for example, https://memos.example.com/). For a local portable preview,
  loopback HTTP such as http://127.0.0.1:18423/ is allowed. The launcher opens
  that address in your usual browser and uses **that server's** own sign-in
  flow. It does not copy accounts, passwords, cookies, notes or data directories.
- **Start a separate private local instance.** Runs the installed Memos Go
  server on loopback port 18423 with its own data under
  `${XDG_DATA_HOME:-$HOME/.local/share}/goreecloud-memos-desktop`
  (0700 permissions). A brand-new local database requires its own administrator
  setup. That screen is **not** a sign-in for an existing server.

The shell interface also supports `goreecloud-memos-desktop --connect URL`,
`--local`, and `--help`. A non-interactive invocation must select a mode
explicitly, so it cannot silently create a different instance.

**Port/profile collision:** If the local port is occupied, the local launcher
fails closed with an explanation instead of opening another, unknown service.
A non-blocking process lock prevents two installed launchers from using the
same data directory concurrently, even with different ports. It cannot prevent
a manually started, non-launcher server from being aimed at that database; do
not run two Memos processes against one SQLite file. The terminal is retained
on failure so the error is visible. Closing the server terminal normally stops
the local process; do not force-stop during database writes.

**Connectivity:** Existing remote server URLs require HTTPS; HTTP is permitted
only for localhost/127.0.0.1/::1. An offline or unreachable server produces a
warning and the browser is opened at the explicitly chosen address, where
normal browser connectivity errors remain visible. The launcher does not
persist or echo passwords.

## Build and test

- Target: Linux AMD64 with Debian-compatible dpkg, Bash, curl, xdg-utils,
  Python 3 and util-linux/flock.
- Build a clean checkout with `cd web && pnpm install --frozen-lockfile &&
  pnpm release`, then `bash packaging/linux/build-deb.sh` at repository root.
- Run `bash packaging/linux/launcher-test.sh` for synthetic, no-install
  launcher regressions.
- Run `bash packaging/linux/smoke-test.sh path/to/package.deb` for a
  disposable localhost instance and SQLite backup/restore check.

For an opt-in forward-upgrade check, pass a previously built development
package as the second input:

```bash
python3 packaging/linux/persistence-smoke.py path/to/current.deb \
  --previous-package path/to/prior.deb
```

The upgrade check starts the older binary, inserts a synthetic memo, then starts
the newer binary against the same temporary database and validates the note
survives a cold restored copy. The smoke test also corrupts a throwaway backup
and verifies that SQLite integrity checks reject it. Neither test installs a
package or reads existing notes.

**Development preview only.** This package does not upgrade or touch any VPS
deployment, other separately installed local profile, or existing portable
preview. It does **not** establish real device install/upgrade, attachment
restore, arbitrary old-version compatibility, downtime or Stable readiness.
