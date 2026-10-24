# ImmichFrame

## Documentation

- [Admin UI](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/getting-started/admin-ui.md) — the admin page where every ImmichFrame setting is edited
- [Configuration reference](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/getting-started/configuration.md) — what each setting does, and the permissions an Immich API key needs
- [Apps](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/getting-started/apps.md) — the Android, iOS and Apple TV apps, and running ImmichFrame on a Frameo frame
- [Video playback](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/features/video-playback.md) — showing videos in the slideshow
- [FAQ](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/faq.md) — common questions

## What you get on StartOS

The **Slideshow** interface is the photo slideshow you open on each frame. The **Admin** interface is where you choose the photos and how they're shown. ImmichFrame keeps no photos of its own: it reads them from Immich each time.

Your photos are private by default. While the slideshow is private, every **Slideshow** address carries an access secret, and a screen opened without it asks for the secret before showing any photos.

## Getting set up

1. Run **Set Admin Password** and copy the password it shows.
2. Run **Manage Access** and keep **Private**, unless anyone who can reach ImmichFrame may see your photos. You don't need to copy the secret it shows: every **Slideshow** address carries it.
3. Give ImmichFrame some photos:
   - If Immich runs on this server, run **Connect Immich**, saying who it's for if you like. Then open Immich's tasks, approve ImmichFrame's request, and choose whose photos to show. The slideshow then shows that person's whole library. Repeat for each person.
   - For an Immich server elsewhere, create an API key in Immich under **Account Settings → API Keys**, with the permissions the configuration reference lists. Then open the **Admin** interface, sign in, and add an account with that server's address and the key.
4. Open a **Slideshow** address on each frame, in its browser or in the ImmichFrame app. The frame remembers the access secret from the address, so you only do this once per frame.
5. If you add calendars to the slideshow, run **Set Time Zone**.

## Using ImmichFrame

### Frames

Use an `https` address of the **Slideshow** interface, on a browser that trusts your server's root certificate authority. The ImmichFrame Android app, Frameo frames included, never trusts a certificate authority you install: give it a public domain with a trusted certificate, or a plain `http` address once your home network's gateway is marked secure in StartOS (see [Secure Gateways](https://docs.start9.com/start-os/gateways.html#secure-gateways)). That setting covers every service on your server, and anything on your network can then read those addresses, the access secret included. A domain added to **Slideshow** also opens the **Admin** page, at `/admin`, behind the admin password.

### The admin page

Open the **Admin** interface and sign in with the password from **Set Admin Password**. Changes apply without a restart. Frames pick up display settings the next time they load the page.

- **Accounts** hold your Immich accounts and which of their photos to show. See below.
- **Weather** needs an OpenWeatherMap API key. **Calendars** take `.ics` links.
- Two settings on this page belong to StartOS: the admin password and the access secret. To change them, use **Set Admin Password** and **Manage Access**. An access secret entered on this page is replaced the next time ImmichFrame starts.

### Choosing which photos to show

An account shows its whole library until you narrow it, including one added by **Connect Immich**. On the **Admin** interface, open **Accounts**:

1. For some albums only, open each album in Immich and copy the ID at the end of its address, after `/albums/`. Paste the IDs into **Albums**, one per line. **People** works the same way, with the ID after `/people/`.
2. For tags, enter each tag's full name in **Tags**, one per line, like `Travel/Europe`. For favorites, tick **Favorites**.
3. Select **Save**.

A photo shows when it matches any of these. **Excluded albums**, the date fields and **Minimum rating** then narrow that set, and ticking **Archived** or **Videos** adds archived photos or videos. **Memories** adds the day's Immich memories; on its own, it shows only those. To show a hand-picked set, put the photos in an Immich album and use its ID.

A shared album shows only the photos of the account it's set on, not those other people added. To show everyone's, run **Connect Immich** for each person, approve it with their account, and give each account the same album ID.

### Actions

- **Set Admin Password** — make a new password for the admin page. The old one stops working.
- **Manage Access** — make the slideshow private or public. Switching back to private keeps the same secret, so frames that already had it keep working. **Generate a new secret** replaces it, for example after losing a frame; open a **Slideshow** address once more on each frame afterwards.
- **Set Time Zone** — the time zone calendar events are shown in. The clock on each frame uses that frame's own time zone.
- **Connect Immich** — ask Immich on this server for one person's photos. You approve the request in Immich's tasks and choose the account there, and ImmichFrame then adds it to the slideshow with its own read-only key, which Immich lists as "StartOS: immichframe". Choosing an account that's already connected replaces its key and keeps the account's settings. If you denied the request, run it again.
- **Disconnect Immich** — remove an account from the slideshow and delete its key from Immich, or withdraw a request you haven't approved.
