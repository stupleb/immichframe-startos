# ImmichFrame

## Documentation

- [Admin UI](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/getting-started/admin-ui.md) — the admin page where every ImmichFrame setting is edited
- [Configuration reference](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/getting-started/configuration.md) — what each setting does, and the permissions an Immich API key needs
- [Apps](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/getting-started/apps.md) — the Android, iOS and Apple TV apps, and running ImmichFrame on a Frameo frame
- [Video playback](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/features/video-playback.md) — showing videos in the slideshow
- [FAQ](https://github.com/immichFrame/ImmichFrame/blob/main/docs/docs/faq.md) — common questions

## What you get on StartOS

The **Slideshow** interface is the photo slideshow you open on each frame. The **Admin** interface is where you choose the photos and how they're shown. ImmichFrame reads your photos from Immich, and keeps copies on your server only if you tick **Download images** in the admin page.

Your photos are private by default. While a slideshow is private, a screen asks for its access secret before showing any photos.

You can run several slideshows, each with its own photos, display settings, addresses and access secret, for example one for the living-room frame and one for a tablet. See **More than one slideshow** below.

## Getting set up

1. Run **Manage Slideshows**. Keep **Private**, unless anyone who can reach ImmichFrame may see your photos, and pick your **Time Zone** if you'll show calendars. The **Access Secret** and **Admin Password** are filled in for you; come back to this action whenever you need to copy them.
2. Give ImmichFrame some photos:
   - If Immich runs on this server, run **Connect Immich**, entering the email of the Immich account to show if you like. Then open Immich's tasks, approve ImmichFrame's request, and choose that account. The slideshow then shows that person's whole library. Repeat for each person.
   - For an Immich server elsewhere, create an API key in Immich under **Account Settings → API Keys**, with the permissions the configuration reference lists. Then open the **Admin** interface, sign in, and add an account with that server's address and the key.
3. On each frame, open a **Slideshow** address and enter the access secret from **Manage Slideshows**. In the ImmichFrame app, paste the address and the secret into their own fields; a browser asks for the secret on the page. The frame remembers it, so you only do this once per frame.

## Using ImmichFrame

### Frames

Use an `https` address of the **Slideshow** interface, on a browser that trusts your server's root certificate authority. The ImmichFrame Android app doesn't trust a root certificate authority installed from Android's settings, even when your browser does. Give it one of these:

- A public domain with a trusted certificate.
- A plain `http` address, once your home network's gateway is marked secure in StartOS (see [Secure Gateways](https://docs.start9.com/start-os/gateways.html#secure-gateways)). That setting covers every service on your server, and anything on your network can then read those addresses, the access secret included.
- On a device with root access, the `https` address, once your root certificate authority is in Android's system certificate store. The community guide [Turning a Frameo photo frame into an Immich slideshow](https://community.start9.com/t/guide-turning-a-frameo-photo-frame-into-an-immich-slideshow/5868) shows how on one frame.

A domain added to **Slideshow** also opens the **Admin** page, at `/admin`, behind that slideshow's admin password.

### The admin page

Open the **Admin** interface and sign in with that slideshow's **Admin Password** from **Manage Slideshows**. Changes apply without a restart. Frames pick up display settings the next time they load the page.

- **Accounts** hold your Immich accounts and which of their photos to show. See below.
- **Weather** needs an OpenWeatherMap API key. **Calendars** take `.ics` links.
- Some settings on this page belong to StartOS: the admin password, the access secret, and which accounts added by **Connect Immich** the slideshow shows. To change them, use **Manage Slideshows**. A change made on this page is replaced. How each account's photos are chosen belongs to this page.

ImmichFrame contacts some services itself: an Immich server elsewhere, OpenWeatherMap for the weather, and the sites your calendar links point to. If you publish a slideshow through a tunnel such as StartTunnel to keep your home IP private, send ImmichFrame's outbound traffic through that tunnel too, or those services see your home IP. If you use the tunnel for another reason, such as a port your router can't forward, there's nothing to change.

### Choosing which photos to show

An account shows its whole library until you narrow it, including one added by **Connect Immich**. On the **Admin** interface, open **Accounts**:

1. For some albums only, open each album in Immich and copy the ID at the end of its address, after `/albums/`. Paste the IDs into **Albums**, one per line. **People** works the same way, with the ID after `/people/`.
2. For tags, enter each tag's full name in **Tags**, one per line, like `Travel/Europe`. For favorites, tick **Favorites**.
3. Select **Save**.

A photo shows when it matches any of these. **Excluded albums**, the date fields and **Minimum rating** then narrow that set, and ticking **Archived** or **Videos** adds archived photos or videos. **Memories** adds the day's Immich memories; on its own, it shows only those. To show a hand-picked set, put the photos in an Immich album and use its ID.

A shared album shows only the photos of the account it's set on, not those other people added. To show everyone's, run **Connect Immich** for each person, approve it with their account, and give each account the same album ID. A person, though, usually has a different ID in each account, so copy each account's **People** IDs while signed in to Immich as that account.

### More than one slideshow

Every slideshow is set up on its own: its own **Slideshow** and **Admin** interfaces, its own accounts and filters, its own access secret, admin password and time zone. Someone with one slideshow's admin password can't sign in to another's, so you can hand a slideshow's **Admin** page to whoever owns that frame.

1. Run **Manage Slideshows**, add a slideshow and give it a name, like "Tablet". Tick the Immich accounts it shows, and save. It gets two new interfaces, **Slideshow (Tablet)** and **Admin (Tablet)**, and your other slideshows keep running.
2. Open **Admin (Tablet)**, sign in, and choose its photos as above.
3. On the tablet, open one of the **Slideshow (Tablet)** addresses and enter the Tablet slideshow's access secret. For the ImmichFrame Android app, use one of the addresses under **Frames**; each slideshow you reach over a public domain needs a domain of its own.

When you connect someone with **Connect Immich**, tick the slideshows that should show them. To change that later, or to remove a slideshow, use **Manage Slideshows**. Your first slideshow can be renamed but not removed. Removing a slideshow deletes its photo choices and settings, and its addresses along with any domains you added to them; adding it back later gives it new addresses.

### Actions

- **Manage Slideshows** — add, rename and remove slideshows, choose which connected accounts each one shows, and make each one private or public. Each private slideshow's **Access Secret** is shown here, to copy onto its frames. Switching back to private keeps the same secret, so frames that already had it keep working. **Generate** makes a new one, for example after losing a frame; enter it again on each of that slideshow's frames afterwards. Each slideshow's **Admin Password** and **Time Zone** are here too. Renaming a slideshow, or changing its admin password or time zone, restarts that slideshow only.
- **Connect Immich** — ask Immich on this server for one person's photos. You approve the request in Immich's tasks and choose the account there, and ImmichFrame then adds it to the slideshows you ticked, with its own read-only key, which Immich lists as "StartOS: immichframe". Choosing an account that's already connected replaces its key and keeps the account's settings. If you denied the request, run it again.
- **Disconnect Immich** — remove an account from every slideshow and delete its key from Immich, or withdraw a request you haven't approved.
