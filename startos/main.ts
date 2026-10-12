import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  cachePath,
  configPath,
  immichBridgeAddress,
  immichUrl,
  readSettings,
  uiPort,
  writeSettings,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  const store = await storeJson.read().const(effects)
  // The critical Set Admin Password task keeps ImmichFrame stopped until there is one.
  if (!store?.adminPassword) throw new Error(i18n('No admin password is set'))
  const { adminPassword, immichConnections, timeZone } = store
  const frameSecret = (store.requireSecret && store.frameSecret) || null
  const immichAddress = immichConnections.length
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

  return sdk.Daemons.of(effects)
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
            const keys = new Set(immichConnections.map((c) => c.apiKey))
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
      uses: { frameSecret, immichAddress, immichConnections },
      requires: ['immichframe'],
    })
})
