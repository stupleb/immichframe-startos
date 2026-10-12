# Updating the upstream version

Upstream is ImmichFrame's official image on GHCR, `ghcr.io/immichframe/immichframe`,
pinned by tag in `startos/manifest/index.ts`. It is built from the
[immichFrame/ImmichFrame](https://github.com/immichFrame/ImmichFrame) release of the
same name, and the package version is that tag without its `v`, e.g. `1.0.39.0:0`.

## Determining the upstream version

ImmichFrame tags releases `vX.Y.Z.W` on GitHub and pushes the image with the same tag:

```bash
gh release view -R immichFrame/ImmichFrame --json tagName -q .tagName
docker manifest inspect ghcr.io/immichframe/immichframe:vX.Y.Z.W | jq -r '.manifests[].platform | "\(.os)/\(.architecture)"'
```

Ignore `latest`. Both `linux/amd64` and `linux/arm64` must be listed.

## Applying the bump

1. Set `images.immichframe.source.dockerTag` and the version in
   `startos/versions/current.ts`, then read the release notes, especially any
   breaking change and the minimum Immich version.
2. Check what the package relies on, in the new tag:
   - `ImmichFrame.WebApi/Services/AdminAuthService.cs` still reads
     `IMMICHFRAME_ADMIN_PASSWORD` and lets it win over the stored password.
   - `ImmichFrame.WebApi/Controllers/AdminController.cs` still serves
     `GET`/`PUT /api/Admin/Settings` and `POST /api/Admin/Settings/TestAccount`
     behind `Bearer <admin password>`, and `ServerSettings.cs` still names
     `General.authenticationSecret`, `Accounts[].immichServerUrl` and
     `Accounts[].apiKey`. `startos/utils.ts` and `startos/main.ts` write those.
   - The Dockerfile still runs as uid 1000 with the settings database in
     `/app/Config`, and `PooledImmichFrameLogic.cs` still downloads to
     `ImageCache` beside the executable.
   - The **API Key Permissions** list in `docs/docs/getting-started/configuration.md`
     still matches `immichKeyPermissions` in `startos/utils.ts`. A new permission
     also has to be added to `dependentKeyPermissions` in immich-startos before
     **Connect Immich** can request it.
3. If the minimum Immich version moved past what `immichVersionRange` in
   `startos/utils.ts` admits, raise it.
4. Install the build, run **Connect Immich**, and confirm the slideshow serves photos.
