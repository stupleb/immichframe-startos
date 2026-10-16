import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  immichRunning,
  immichVersion,
  readSettings,
  revokeImmichAccess,
  withImmichDependency,
  writeSettings,
} from '../utils'

const { InputSpec, Value } = sdk

// Immich account ids are UUIDs.
const pendingRequest = 'pending'

const inputSpec = InputSpec.of({
  immichUserId: Value.dynamicSelect(async () => {
    const store = await storeJson.read().once()
    return {
      name: i18n('Immich account'),
      values: {
        ...Object.fromEntries(
          (store?.immichConnections ?? []).map((c) => [
            c.immichUserId,
            c.email,
          ]),
        ),
        ...(store?.immichRequest && {
          [pendingRequest]: [
            i18n('Request waiting for approval'),
            store.immichRequest.label,
          ]
            .filter(Boolean)
            .join(': '),
        }),
      },
      default: null,
    }
  }),
})

export const disconnectImmich = sdk.Action.withInput(
  'disconnect-immich',

  async ({ effects }) => ({
    name: i18n('Disconnect Immich'),
    description: i18n(
      'Remove an Immich account from the slideshow and delete the key ImmichFrame used for it, or withdraw a request still waiting for approval in Immich.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Immich'),
    visibility: (await storeJson
      .read((s) => s.immichConnections.length > 0 || !!s.immichRequest)
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
    const apiKey =
      connection?.apiKey ??
      (input.immichUserId === pendingRequest
        ? store.immichRequest?.apiKey
        : null)
    if (!apiKey) throw new Error(i18n('That Immich account is not connected'))
    // An uninstalled Immich took its keys with it.
    if (await immichVersion(effects).once()) {
      if (!(await immichRunning(effects)))
        throw new Error(i18n('Start Immich first'))
      await withImmichDependency(effects, true, () =>
        revokeImmichAccess(effects, apiKey),
      )
    }

    if (!connection) {
      await storeJson.merge(effects, { immichRequest: null })
      return {
        version: '1',
        title: i18n('Request Withdrawn'),
        message: i18n(
          'Immich no longer asks to approve ImmichFrame’s request.',
        ),
        result: null,
      }
    }

    const settings = await readSettings(store.adminPassword)
    await writeSettings(store.adminPassword, {
      ...settings,
      Accounts: settings.Accounts.filter((a) => a.apiKey !== apiKey),
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
