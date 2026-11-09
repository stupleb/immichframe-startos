<p align="center">
  <img src="icon.svg" alt="ImmichFrame Logo" width="21%">
</p>

# ImmichFrame on StartOS

> Everything not listed in this document should behave the same as upstream
> ImmichFrame. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[ImmichFrame](https://github.com/immichFrame/ImmichFrame) turns a browser, tablet, TV or photo frame into a slideshow of photos from one or more Immich servers. This package runs one copy of it per slideshow, each with its own photos, display settings, addresses, access secret, admin password and time zone, and can connect the slideshows to Immich on the same server with a read-only key that the user approves in Immich.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs upstream's published image, for x86_64 and aarch64, with its own entrypoint (`dotnet ImmichFrame.WebApi.dll`) as uid 1000. The root `Dockerfile` upgrades the image's `ca-certificates` package, so its trust store drops the compromised eMudhra certificate authority (emSign ECC Root CA - G3), and fails the build if that root remains. It's a temporary layer that comes out once upstream ships an image built on a fixed store.

Each slideshow is a separate ImmichFrame server: upstream has no way for frames to show different photos from one server. Slideshow `<id>` (`main` for the first) gets a subcontainer `immichframe-<id>` running three steps in order:

- `chown-<id>` — a oneshot, as root, that gives uid 1000 the slideshow's folders on the `config` and `cache` volumes.
- `immichframe-<id>` — the ImmichFrame server, listening on the slideshow's own port (`ASPNETCORE_HTTP_PORTS`): 8080 for the first, the lowest free port from 8081 for the others.
- `apply-settings-<id>` — a oneshot that, once the server is listening, writes the StartOS-owned settings into it through its admin API (see [File Models](#file-models)).

`main` is a `Daemons.dynamic` reconciler, so adding or removing a slideshow, or changing its access or Immich accounts, starts, stops or re-runs only that slideshow's steps. Renaming a slideshow, or changing its admin password or time zone, restarts that slideshow's server only: the name is part of its health check, and the other two reach it through the environment.

## Volume and Data Layout

Three volumes. Each ImmichFrame server keeps all of its own settings, Immich accounts and API keys included, in one SQLite database.

| Volume    | Mount point       | Holds                                                                                         |
| --------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `config`  | `/app/Config`     | `immichframe.db`, ImmichFrame's settings database                                             |
| `cache`   | `/app/ImageCache` | photos ImmichFrame downloads when **DownloadImages** is on in its admin page; empty otherwise |
| `startos` | not mounted       | `store.json`                                                                                  |

The first slideshow mounts the volume roots. Every other slideshow mounts `slideshows/<id>` on both `config` and `cache`, so the first slideshow's `/app/Config` also contains the others' folders. Removing a slideshow in **Manage Slideshows** deletes both of its folders, and retires its host with any domains added to it.

## File Models

The package writes no ImmichFrame configuration file; each server's settings database is the source of truth and is edited in its admin page. The package keeps its own state in `store.json`, fills in missing defaults at every init, and pushes some of it into those databases: `apply-settings-<id>` runs when that slideshow starts, and again whenever its access, secret, admin password or accounts, the connected keys, or Immich's address change.

`store.json` holds:

- `slideshows` — one entry per slideshow, written by **Manage Slideshows**; the first, `main`, always exists:
  - `id`, `name` (`null` for an unnamed first slideshow) and `port`.
  - `access` — `private` or `public`; unset on the first slideshow until **Manage Slideshows** first runs.
  - `secret` — the slideshow's access secret. It stays stored while the slideshow is public. `apply-settings-<id>` writes it to ImmichFrame's **AuthenticationSecret** setting while access is private, and clears that setting while it is public, so a value typed into the admin page is replaced.
  - `adminPassword` — unset on the first slideshow until **Manage Slideshows** first runs. It reaches that slideshow's server as `IMMICHFRAME_ADMIN_PASSWORD`, which ImmichFrame reads on every start and which overrides the **AdminPassword** setting in its admin page, so that setting has no effect. It opens that slideshow's admin page only.
  - `timeZone` — `UTC` until chosen. It reaches that slideshow's server as `TZ`. ImmichFrame uses it for calendar events; each frame's clock runs in the browser's own time zone.
  - `accounts` — the Immich user ids, out of `immichConnections`, whose photos it shows. **Immich Access** adds the account an approval chose, and **Disconnect Immich** removes it. `apply-settings-<id>` adds an ImmichFrame account carrying each one's key that the server lacks, removes accounts carrying a connected key that is not listed, and rewrites the server URL of the listed ones to Immich's current bridge address. Every other field of those accounts, and every account carrying another key, belongs to the user.
- `immichConnections` — one entry per account added by **Connect Immich**: the Immich user, its email, and the key's secret. Every slideshow showing that account uses the same key.
- `immichRequest` — the **Connect Immich** request that Immich has not accepted yet, or `null`: its key, the optional label it was sent with, and the slideshows chosen for it.

## Dependencies

Immich is an optional dependency, declared only while **Connect Immich** has an account connected or a request waiting. It must be running, but no health check is required. Uninstalling Immich with accounts still connected leaves it declared, and listed as missing, until **Disconnect Immich** removes the last one.

ImmichFrame reaches it over the StartOS bridge with a key it generates itself. **Connect Immich** sends Immich only the key's SHA-256, through Immich's hidden `request-access` action, and the user approves the request in Immich's tasks, choosing the account there. Immich then stores the key under that account as `StartOS: immichframe`, one key per account. The key carries `album.read`, `album.statistics`, `asset.read`, `asset.statistics`, `asset.view`, `face.read`, `memory.read`, `person.read`, `person.statistics`, `tag.read` and `user.read`; the last lets ImmichFrame read which account was chosen from `GET /api/users/me`. **Disconnect Immich**, and uninstalling ImmichFrame, delete keys through Immich's `revoke-access` action. Immich servers elsewhere are added by hand in a slideshow's admin page and are not dependencies.

## Network Access and Interfaces

Each slideshow has its own host, with two interfaces on its port.

| Interface              | Type | Port            | Protocol | Purpose                                              |
| ---------------------- | ---- | --------------- | -------- | ---------------------------------------------------- |
| `ui` / `ui-<id>`       | `ui` | the slideshow's | HTTP     | the slideshow at `/`                                 |
| `admin` / `admin-<id>` | `ui` | the slideshow's | HTTP     | the admin page at `/admin`, which calls `/api/Admin` |

The first slideshow keeps host `ui-multi` and interfaces `ui` and `admin`, so its addresses and domains never change; the others use host `slideshow-<id>`. A named slideshow's interfaces are called **Slideshow (name)** and **Admin (name)**.

A private slideshow's page asks for its secret, and the ImmichFrame app takes it in a field of its own; the admin page signs in with that slideshow's admin password instead. ImmichFrame's web client stores the secret in the browser's local storage, or in the app's settings, and sends it as a `Bearer` token on every API call. Without it, the asset endpoints answer 401. `/api/Config` (display settings) answers without it, as upstream.

## Installation and First-Run Flow

ImmichFrame cannot start until **Manage Slideshows** has run (see [Tasks](#tasks)). Manage Slideshows defaults to private, so the first slideshow is locked from the start unless the user chooses public. Because the password always arrives through the environment, ImmichFrame's anonymous first-run screen at `/admin`, where whoever arrives first chooses the admin password, never appears.

ImmichFrame starts with one slideshow and no Immich account, and shows a hint saying so. Accounts come from **Connect Immich** or a slideshow's admin page.

## Actions

Three actions, all user-facing. **Manage Slideshows** holds everything that belongs to a slideshow; **Connect Immich** and **Disconnect Immich** link and unlink Immich accounts. Only **Manage Slideshows** restarts anything, and only the slideshows whose name, admin password or time zone it changes, for a few seconds each.

- **Manage Slideshows** — run on install (its task asks for it), and whenever a slideshow is added, removed or changed. Repeatable. It refuses to remove the first slideshow, an unnamed slideshow other than the first, and two slideshows with the same name. It keeps only accounts that are still connected, and an account connected while its form was open keeps the slideshows its approval chose. It saves the first slideshow first, whatever the order in the form. Its form shows each slideshow's stored access secret and admin password, so it is where they are read again.
  - A slideshow's secret is kept while it is public, so making it private again restores it and frames that already have it keep working. A new secret is for a lost frame: every frame of that slideshow then needs it entered again.
  - A slideshow's admin password opens its own admin page only; changing it cuts off whoever had the old one.
  - A new slideshow starts on the first slideshow's time zone, with an empty settings database. Removing one deletes its folders and retires its host, with any domains added to it.

- **Connect Immich** — hidden while Immich isn't installed on this server, and disabled, naming the Immich version needed, while it is too old to take ImmichFrame's request. Both services must be running. The **Immich Account Email** selects nothing: it goes to Immich as the request's label, only when Immich's form has a label field, and is shown with the request. It generates a key, stores it with the label and slideshows as `immichRequest`, and asks Immich for access with it. Immich raises a task in which the user approves the request and chooses the account, or denies it; the **Immich Access** health check waits meanwhile. Once Immich accepts the key, the account is added to the chosen slideshows, showing its whole library. Approving an account that is already connected makes Immich delete that account's old key, and ImmichFrame swaps the new key into every slideshow showing it, keeping its filters, and adds it to any newly chosen slideshow. Run it once per person. Running it again while a request waits withdraws that request first; if Immich has approved it in the meantime, it fails and asks to be run again in a few seconds, once that account is added.
- **Disconnect Immich** — shown while an account is connected or a request waits. For an account, it deletes the key in Immich, removes the account carrying it from every slideshow, and drops the Immich dependency when nothing is left. For a waiting request, it withdraws the request and clears Immich's task. Immich has to be running, unless it is uninstalled, which already took its keys.

## Tasks

The package raises one task.

- **Manage Slideshows** — `critical`, raised while a slideshow has no admin password, or isn't public and has no secret, which is the case for the first slideshow after install. It blocks ImmichFrame from starting, and clears as soon as the action runs. It can't come back, since the form requires both for every slideshow. An update keeps the admin password, access and secret the install already had, so it raises no task.

The task that approves a **Connect Immich** request is Immich's own **Approve Access**, `important`, raised on Immich's page, one per request; Immich keeps running meanwhile.

## Health Checks

One check per slideshow, plus one for Immich. Both kinds use the SDK's default 10-second grace period.

- **Web Interface** (`immichframe-<id>`; **Web Interface (name)** for a named slideshow) — that slideshow's server is listening on its port. It passes within seconds of start. If it fails, read the service log: ImmichFrame exits at startup when `/app/Config` is not writable (`Cannot open the settings database`), which the `chown-<id>` step prevents.
- **Immich Access** (`immich-access`) — present while Immich is installed, every 15 seconds; `disabled` while no account is connected and no request waits. While a request waits, it tries the pending key on Immich's `GET /api/users/me`. While Immich answers 401 it reports `loading` with `waiting`, asking for approval in Immich's tasks, and, since Immich answers a pending and a denied request alike, for **Disconnect Immich** to stop asking or **Connect Immich** to ask again. Once Immich accepts the key, it records the account on the chosen slideshows, and revokes the key of an account the approval replaced. With no request waiting, it tries every connected account's key, and fails, naming the accounts, when Immich refuses one: the key was deleted in Immich, the Immich account was deleted, or Immich was reinstalled or restored from an older backup. It also reports `loading` while Immich is stopped or not answering, and fails when Immich answers anything else. It fails with "Immich has no address ImmichFrame can reach" when Immich is installed but StartOS has no binding for its web interface, as while Immich is still installing. If it persists with Immich installed and running, an Immich release has moved that interface and ImmichFrame needs updating.

An unreachable or too-old Immich server does not fail it. ImmichFrame logs that as critical and keeps running, and the slideshow then shows no photos.

## Backups and Restore

The `startos` and `config` volumes are copied whole, every slideshow's folder included, while ImmichFrame is stopped, so the settings databases are captured at rest. `cache` is excluded: it holds only copies of photos that ImmichFrame downloads again from Immich.

A restored ImmichFrame keeps its slideshows, admin passwords, access secrets, accounts and keys. Restored onto a server that no longer has ImmichFrame installed, every slideshow gets new port numbers from StartOS: a frame on a domain keeps working, but a frame on an address with a port needs the new address, and its secret again. A connected account's key works only while Immich still holds it. Uninstalling ImmichFrame revokes its keys, and Immich restored from a backup taken before the approval has none of them: run **Connect Immich** and choose the same account, which swaps the new key in and keeps the account's filters. A reinstalled Immich has new accounts as well, so first disconnect each old one, which drops its filters, then connect again.

## Limitations and Differences

What differs from upstream ImmichFrame, or is out of reach on StartOS:

1. Each slideshow's admin password, access secret and connected Immich accounts are owned by **Manage Slideshows**. Their fields in an admin page are overridden: the admin password always, the access secret and the connected accounts the next time that slideshow's settings are applied. Filters on a connected account (albums, people and the rest) belong to the admin page.
2. Over the LAN, frames open an `https` address signed by the server's root CA, until the LAN gateway is marked secure (`start-cli net gateway set-secure`), which also offers the interface's plain `http` address there. The ImmichFrame Android app declares no network security config, so on Android 7 and later it ignores a root CA installed from Android's settings, which is where StartOS's trust guide puts it, even though browsers on the same device accept it. The app needs a public domain with a publicly trusted certificate, or that plain address. A device with root access can add the root CA to the system certificate store instead, which every app trusts. Over plain `http`, the access secret and the admin password cross the network unencrypted.
3. A slideshow's two interfaces share one host, so a domain added to either serves both: `/admin` is reachable on a public slideshow domain, behind that slideshow's admin password. ImmichFrame serves only from the root of a domain, so every slideshow a frame reaches over a public domain needs a domain of its own.
4. ImmichFrame selects photos through Immich's search, which returns only the key owner's assets (and partners' shown in their timeline). A shared album therefore shows only the connected account's own photos in it; adding each member's account to the slideshow with the same album ID shows all of them. A person, though, usually has a different ID in each account: Immich groups faces into people within a people cluster group, and each account has its own unless its user joins another's. Each account's **People** takes the IDs that account sees.
5. Custom CSS (upstream's `custom.css` bind mount) is not supported.
6. `LOG_LEVEL` is fixed at `Warning`; at upstream's default, ImmichFrame logs every SQL statement.

---

## Quick Reference for AI Consumers

```yaml
package_id: immichframe
image: ghcr.io/immichframe/immichframe # CA store upgraded by Dockerfile
architectures: [x86_64, aarch64]
subcontainers: [immichframe-<id>] # one per slideshow; <id> is main for the first
volumes:
  config: /app/Config
  cache: /app/ImageCache
  startos: null
file_models:
  - store.json
startos_managed_env_vars:
  - IMMICHFRAME_ADMIN_PASSWORD
  - TZ
  - LOG_LEVEL
  - ASPNETCORE_HTTP_PORTS
dependencies: [immich]
interfaces: # first slideshow; others add ui-<id> and admin-<id> on host slideshow-<id>
  ui: { type: ui, port: 8080 }
  admin: { type: ui, port: 8080 }
actions:
  - manage-slideshows
  - connect-immich
  - disconnect-immich
tasks:
  - { action: manage-slideshows, severity: critical }
health_checks:
  - immichframe-<id> # one per slideshow
  - immich-access
```
