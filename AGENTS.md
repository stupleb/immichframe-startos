# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- **Don't seed ImmichFrame from a `Settings.json`/`Settings.yml` in `/app/Config`.** ImmichFrame imports one only into an empty database and logs it as deprecated; the package writes settings through the admin API.
- **Never return `waiting` from the `immich-access` health check; use `loading`.** The StartOS UI shows a service as Starting while any check is `waiting`, which disables the only-running Connect and Disconnect Immich actions that would clear it.
