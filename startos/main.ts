import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  cachePath,
  configPath,
  immichBridgeAddress,
  immichKeyOwner,
  immichRunning,
  immichUrl,
  immichVersion,
  readSettings,
  revokeImmichAccess,
  slideshowIds,
  writeSettings,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) =>
  sdk.Daemons.dynamic(effects, async ({ effects: dyn }) => {
    const store = await storeJson
      .read((s) => ({
        slideshows: s.slideshows.map((sl) => ({
          id: sl.id,
          name: sl.name,
          port: sl.port,
          secret: sl.access === 'public' ? null : sl.secret,
          adminPassword: sl.adminPassword,
          timeZone: sl.timeZone,
          accounts: sl.accounts,
        })),
        connections: s.immichConnections.map((c) => ({
          immichUserId: c.immichUserId,
          apiKey: c.apiKey,
        })),
      }))
      .const(dyn)
    // The critical Manage Slideshows task keeps ImmichFrame stopped until every slideshow has both.
    const slideshows = (store?.slideshows ?? []).map(
      ({ adminPassword, ...s }) => {
        if (!adminPassword || s.secret === undefined)
          throw new Error('Manage Slideshows has not been run')
        return { ...s, adminPassword }
      },
    )
    const connections = store?.connections ?? []
    const immichInstalled = !!(await immichVersion(dyn).const())
    const immichAddress = immichInstalled
      ? await immichBridgeAddress(dyn).const()
      : null
    const ourKeys = connections.map((c) => c.apiKey)

    let daemons = sdk.Daemons.of(dyn)
    for (const {
      id,
      name,
      port,
      secret,
      adminPassword,
      timeZone,
      accounts,
    } of slideshows) {
      const { subpath } = slideshowIds(id)
      const memberKeys = connections
        .filter((c) => accounts.includes(c.immichUserId))
        .map((c) => c.apiKey)
      const sub = sdk.SubContainer.of(
        dyn,
        { imageId: 'immichframe' },
        sdk.Mounts.of()
          .mountVolume({
            volumeId: 'config',
            subpath,
            mountpoint: configPath,
            readonly: false,
          })
          .mountVolume({
            volumeId: 'cache',
            subpath,
            mountpoint: cachePath,
            readonly: false,
          }),
        `immichframe-${id}`,
      )
      const env = {
        IMMICHFRAME_ADMIN_PASSWORD: adminPassword,
        TZ: timeZone,
        ASPNETCORE_HTTP_PORTS: String(port),
        // Information logs every SQL statement.
        LOG_LEVEL: 'Warning',
      }
      const display = name
        ? i18n('Web Interface (${name})', { name })
        : i18n('Web Interface')
      // Ids built at runtime are invisible to the chain's id types.
      daemons = daemons
        .addOneshot(`chown-${id}`, {
          subcontainer: sub,
          exec: {
            command: ['chown', '-R', '1000:0', configPath, cachePath],
            user: 'root',
          },
          // A finished oneshot keeps its subcontainer alive, so it re-runs whenever the daemon sharing it is replaced.
          uses: { env, display },
          requires: [],
        })
        .addDaemon(`immichframe-${id}`, {
          subcontainer: sub,
          exec: { command: sdk.useEntrypoint(), env },
          ready: {
            display,
            fn: () =>
              sdk.healthCheck.checkPortListening(effects, port, {
                successMessage: i18n('The web interface is ready'),
                errorMessage: i18n('The web interface is not ready'),
              }),
          },
          requires: [`chown-${id}`] as never[],
        })
        .addOneshot(`apply-settings-${id}`, {
          subcontainer: null,
          exec: {
            fn: async () => {
              const settings = await readSettings(port, adminPassword)
              let changed = false
              if ((settings.General.authenticationSecret ?? null) !== secret) {
                settings.General.authenticationSecret = secret
                changed = true
              }
              if (immichAddress) {
                const url = immichUrl(immichAddress)
                const kept = settings.Accounts.filter(
                  (a) =>
                    !ourKeys.includes(a.apiKey) ||
                    memberKeys.includes(a.apiKey),
                )
                if (kept.length !== settings.Accounts.length) changed = true
                for (const a of kept)
                  if (
                    memberKeys.includes(a.apiKey) &&
                    a.immichServerUrl !== url
                  ) {
                    a.immichServerUrl = url
                    changed = true
                  }
                for (const apiKey of memberKeys)
                  if (!kept.some((a) => a.apiKey === apiKey)) {
                    kept.push({ immichServerUrl: url, apiKey })
                    changed = true
                  }
                settings.Accounts = kept
              }
              if (changed) await writeSettings(port, adminPassword, settings)
              return null
            },
          },
          uses: { adminPassword, secret, immichAddress, ourKeys, memberKeys },
          requires: [`immichframe-${id}`] as never[],
        }) as unknown as typeof daemons
    }
    if (!immichInstalled) return daemons

    return daemons.addHealthCheck('immich-access', {
      ready: {
        display: i18n('Immich Access'),
        trigger: sdk.trigger.cooldownTrigger(15_000),
        // A health check takes no `uses`, so this closure outlives reconciles: it reads its state fresh and writes through setupMain's effects, which const-read nothing.
        fn: async () => {
          const current = await storeJson.read().once()
          const { immichConnections, immichRequest } = current ?? {}
          if (!immichConnections?.length && !immichRequest)
            return {
              result: 'disabled',
              message: i18n('No Immich account is connected'),
            }
          if (!(await immichRunning(effects)))
            return {
              result: 'loading',
              message: i18n('Immich is not running'),
            }
          const address = await immichBridgeAddress(effects).once()
          if (!address)
            return {
              result: 'failure',
              message: i18n('Immich has no address ImmichFrame can reach'),
            }
          const noAnswer = {
            result: 'loading',
            message: i18n('Immich is not answering'),
          } as const

          if (!immichRequest) {
            const refused: string[] = []
            for (const c of immichConnections ?? []) {
              const owner = await immichKeyOwner(address, c.apiKey)
              if (owner === 'no-answer') return noAnswer
              if (owner === 'unapproved') refused.push(c.email)
            }
            return refused.length
              ? {
                  result: 'failure',
                  message: i18n(
                    'Immich no longer accepts ImmichFrame’s key for ${emails}. Run Connect Immich and choose that account again, or disconnect it.',
                    { emails: refused.join(', ') },
                  ),
                }
              : {
                  result: 'success',
                  message: i18n('Immich accepts every connected account’s key'),
                }
          }

          const { apiKey, label } = immichRequest
          const owner = await immichKeyOwner(address, apiKey)
          if (owner === 'no-answer') return noAnswer
          if (owner === 'unapproved')
            return {
              result: 'loading',
              waiting: true,
              message: label
                ? i18n(
                    'Approve ImmichFrame’s request for ${label} in Immich’s tasks. If you denied it, run Disconnect Immich to stop asking, or Connect Immich to ask again.',
                    { label },
                  )
                : i18n(
                    'Approve ImmichFrame’s request in Immich’s tasks. If you denied it, run Disconnect Immich to stop asking, or Connect Immich to ask again.',
                  ),
            }

          // Approving in an account ImmichFrame already reads replaces that account's key; its filters stay.
          const replaced = immichConnections?.find(
            (c) => c.immichUserId === owner.id,
          )
          if (replaced)
            for (const { port, adminPassword } of current?.slideshows ?? []) {
              if (!adminPassword) continue
              const settings = await readSettings(port, adminPassword)
              const account = settings.Accounts.find(
                (a) => a.apiKey === replaced.apiKey,
              )
              if (!account) continue
              account.immichServerUrl = immichUrl(address)
              account.apiKey = apiKey
              await writeSettings(port, adminPassword, settings)
            }
          await storeJson.update(effects, (s) =>
            s?.immichRequest?.apiKey === apiKey
              ? {
                  ...s,
                  immichRequest: null,
                  immichConnections: [
                    ...s.immichConnections.filter(
                      (c) => c.immichUserId !== owner.id,
                    ),
                    { immichUserId: owner.id, email: owner.email, apiKey },
                  ],
                  slideshows: s.slideshows.map((sl) =>
                    immichRequest.slideshows.includes(sl.id) &&
                    !sl.accounts.includes(owner.id)
                      ? { ...sl, accounts: [...sl.accounts, owner.id] }
                      : sl,
                  ),
                }
              : null,
          )
          if (replaced)
            await revokeImmichAccess(effects, replaced.apiKey).catch((e) =>
              console.error(`Could not revoke the replaced Immich key: ${e}`),
            )
          return {
            result: 'success',
            message: current?.slideshows.some((sl) =>
              immichRequest.slideshows.includes(sl.id),
            )
              ? i18n('Added ${email} to the slideshows you chose', {
                  email: owner.email,
                })
              : i18n(
                  'Connected ${email}, but the slideshows chosen for it were removed. Choose its slideshows in Manage Slideshows.',
                  { email: owner.email },
                ),
          }
        },
      },
      requires: slideshows.map((s) => `apply-settings-${s.id}`) as never[],
    })
  }),
)
