import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  cachePath,
  configPath,
  immichBridgeAddress,
  immichKeyOwner,
  immichRunning,
  immichVersion,
  revokeImmichAccess,
  immichUrl,
  readSettings,
  uiPort,
  writeSettings,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  // Immich connections stay out of this read: the immich-access check writes them.
  const store = await storeJson
    .read(
      (s) =>
        s && {
          adminPassword: s.adminPassword,
          frameSecret: (s.requireSecret && s.frameSecret) || null,
          timeZone: s.timeZone,
        },
    )
    .const(effects)
  // The critical Set Admin Password task keeps ImmichFrame stopped until there is one.
  if (!store?.adminPassword) throw new Error(i18n('No admin password is set'))
  const { adminPassword, frameSecret, timeZone } = store
  const immichInstalled = !!(await immichVersion(effects).const())
  const immichAddress = immichInstalled
    ? await immichBridgeAddress(effects).const()
    : null

  const sub = await sdk.SubContainer.of(
    effects,
    { imageId: 'immichframe' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'config',
        subpath: null,
        mountpoint: configPath,
        readonly: false,
      })
      .mountVolume({
        volumeId: 'cache',
        subpath: null,
        mountpoint: cachePath,
        readonly: false,
      }),
    'immichframe-sub',
  )

  const daemons = sdk.Daemons.of(effects)
    .addOneshot('chown', {
      subcontainer: sub,
      exec: {
        command: ['chown', '-R', '1000:0', configPath, cachePath],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('immichframe', {
      subcontainer: sub,
      exec: {
        command: sdk.useEntrypoint(),
        env: {
          IMMICHFRAME_ADMIN_PASSWORD: adminPassword,
          TZ: timeZone,
          // Information logs every SQL statement.
          LOG_LEVEL: 'Warning',
        },
      },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          }),
      },
      requires: ['chown'],
    })
    .addOneshot('apply-settings', {
      subcontainer: null,
      exec: {
        fn: async () => {
          const settings = await readSettings(adminPassword)
          let changed = false
          if ((settings.General.authenticationSecret ?? null) !== frameSecret) {
            settings.General.authenticationSecret = frameSecret
            changed = true
          }
          if (immichAddress) {
            const keys = new Set(
              (
                (await storeJson.read((s) => s.immichConnections).once()) ?? []
              ).map((c) => c.apiKey),
            )
            for (const account of settings.Accounts) {
              if (
                keys.has(account.apiKey) &&
                account.immichServerUrl !== immichUrl(immichAddress)
              ) {
                account.immichServerUrl = immichUrl(immichAddress)
                changed = true
              }
            }
          }
          if (changed) await writeSettings(adminPassword, settings)
          return null
        },
      },
      uses: { frameSecret, immichAddress },
      requires: ['immichframe'],
    })
  if (!immichInstalled) return daemons

  return daemons.addHealthCheck('immich-access', {
    ready: {
      display: i18n('Immich Access'),
      trigger: sdk.trigger.cooldownTrigger(15_000),
      fn: async () => {
        const { immichConnections, immichRequest } =
          (await storeJson.read().once()) ?? {}
        if (!immichConnections?.length && !immichRequest)
          return {
            result: 'disabled',
            message: i18n('No Immich account is connected'),
          }
        if (!(await immichRunning(effects)))
          return { result: 'loading', message: i18n('Immich is not running') }
        if (!immichAddress)
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
            const owner = await immichKeyOwner(immichAddress, c.apiKey)
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
        const owner = await immichKeyOwner(immichAddress, apiKey)
        if (owner === 'no-answer') return noAnswer
        if (owner === 'unapproved')
          return {
            result: 'loading',
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
        const settings = await readSettings(adminPassword)
        if (!settings.Accounts.some((a) => a.apiKey === apiKey)) {
          const account = settings.Accounts.find(
            (a) => replaced && a.apiKey === replaced.apiKey,
          )
          if (account) {
            account.immichServerUrl = immichUrl(immichAddress)
            account.apiKey = apiKey
          } else {
            settings.Accounts.push({
              immichServerUrl: immichUrl(immichAddress),
              apiKey,
            })
          }
          await writeSettings(adminPassword, settings)
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
              }
            : null,
        )
        if (replaced)
          await revokeImmichAccess(effects, replaced.apiKey).catch((e) =>
            console.error(`Could not revoke the replaced Immich key: ${e}`),
          )
        return {
          result: 'success',
          message: i18n('Added ${email} to the slideshow', {
            email: owner.email,
          }),
        }
      },
    },
    requires: ['apply-settings'],
  })
})
