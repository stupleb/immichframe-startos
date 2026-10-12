import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getRandomString } from '../utils'

export const setAdminPassword = sdk.Action.withoutInput(
  'set-admin-password',

  async ({ effects }) => ({
    name: i18n('Set Admin Password'),
    description: i18n(
      'Generate a new random password for the ImmichFrame admin page. Replaces any existing password.',
    ),
    warning: (await storeJson.read((s) => s.adminPassword).const(effects))
      ? i18n('Replaces the current admin password.')
      : null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const adminPassword = getRandomString(24)
    await storeJson.merge(effects, { adminPassword })
    return {
      version: '1',
      title: i18n('Admin Password'),
      message: i18n(
        'Use this password to sign in on the ImmichFrame Admin interface.',
      ),
      result: {
        type: 'single',
        value: adminPassword,
        masked: true,
        copyable: true,
        qr: false,
        launchable: false,
      },
    }
  },
)
