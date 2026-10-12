import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  deleteImmichKey,
  IMMICH_ID,
  immichVersion,
  readSettings,
  withImmichDependency,
  writeSettings,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  immichUserId: Value.dynamicSelect(async () => ({
    name: i18n('Immich account'),
    values: Object.fromEntries(
      ((await storeJson.read((s) => s.immichConnections).once()) ?? []).map(
        (c) => [c.immichUserId, c.email],
      ),
    ),
    default: null,
  })),
})

export const disconnectImmich = sdk.Action.withInput(
  'disconnect-immich',

  async ({ effects }) => ({
    name: i18n('Disconnect Immich'),
    description: i18n(
      'Remove an Immich account from the slideshow, and delete the Immich API key ImmichFrame used for it.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Immich'),
    visibility: (await storeJson
      .read((s) => s.immichConnections.length > 0)
      .const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    if (!store?.adminPassword) throw new Error(i18n('No admin password is set'))
    const connection = store.immichConnections.find(
      (c) => c.immichUserId === input.immichUserId,
    )
    if (!connection)
      throw new Error(i18n('That Immich account is not connected'))
    // An uninstalled Immich took its keys with it.
    if (await immichVersion(effects).once()) {
      if (
        !(await sdk.getStatus(effects, { packageId: IMMICH_ID }).once())
          ?.started
      )
        throw new Error(i18n('Start Immich first'))
      await withImmichDependency(effects, true, () =>
        deleteImmichKey(effects, connection.immichUserId, connection.keyId),
      )
    }
    const settings = await readSettings(store.adminPassword)
    await writeSettings(store.adminPassword, {
      ...settings,
      Accounts: settings.Accounts.filter((a) => a.apiKey !== connection.apiKey),
    })
    await storeJson.merge(effects, {
      immichConnections: store.immichConnections.filter(
        (c) => c !== connection,
      ),
    })
    return {
      version: '1',
      title: i18n('Immich Disconnected'),
      message: i18n(
        'The slideshow no longer shows ${email}’s photos, and the key ImmichFrame used is deleted from Immich.',
        { email: connection.email },
      ),
      result: null,
    }
  },
)
