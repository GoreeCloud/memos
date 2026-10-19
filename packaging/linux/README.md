# GoreeCloud Memos — Linux desktop development package

The `.deb` installs a **local-only** Memos service and a desktop launcher, not
an Electron or GTK-native client. It requires a browser for the interface.

- Target: Linux AMD64 systems with Debian-compatible `dpkg`, Bash, curl and xdg-utils.
- Interface: locally served Memos web UI at `http://127.0.0.1:18423`.
- Data: `${XDG_DATA_HOME:-~/.local/share}/goreecloud-memos-desktop` (chmod 0700).
- Close the terminal window to stop the local server. Do not force-stop during database writes.
- If port 18423 is occupied, the launcher fails closed rather than opening another service.
- This package does not upgrade or touch existing GoreeCloud VPS Memos installations.

To build from a clean checkout: `cd web && pnpm install --frozen-lockfile && pnpm release`,
then `bash packaging/linux/build-deb.sh` at the root.

**Development preview only.** Require clean-install, data-migration, upgrade,
accessibility and Linux desktop acceptance before Stable release.

For isolated recovery verification, run `bash packaging/linux/smoke-test.sh path/to/package.deb`.
This uses a disposable localhost server and SQLite fixture to check an initial
startup, restart, and cold backup/restore. For an opt-in forward-upgrade check,
pass a previously built development package as the second input:

```bash
python3 packaging/linux/persistence-smoke.py path/to/current.deb \\
  --previous-package path/to/prior.deb
```

The upgrade check starts the older binary, inserts a synthetic memo, then starts
the newer binary against the same temporary database and validates that its note
survives a cold restored copy. The smoke test also corrupts a separate
throwaway backup and verifies that SQLite integrity checks reject it.
It never installs either package or reads existing notes. **It does not
qualify arbitrary older versions, downgrade support, attachments, or
owner-data recovery**; real migration and desktop acceptance
are still required before production or Stable release.
