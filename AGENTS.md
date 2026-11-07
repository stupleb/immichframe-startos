# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- **Don't seed ImmichFrame from a `Settings.json`/`Settings.yml` in `/app/Config`.** ImmichFrame imports one only into an empty database and logs it as deprecated; the package writes settings through the admin API.
- **Keep the first slideshow on id `main`, host `ui-multi` and interfaces `ui` and `admin`.** Users' domains and frames point at them; another id gives them new addresses.
- **List every value an `apply-settings-<id>` closure reads in its `uses`.** The reconciler re-runs a step only when its hashed fields change, and a closure is invisible to the hash.
