import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getRandomString } from '../utils'

export const resetAccessSecret = sdk.Action.withoutInput(
  'reset-access-secret',

  async ({ effects }) => ({
    name: i18n('Reset Access Secret'),
    description: i18n(
      'Replace the access secret with a new one, for example after a frame is lost. Every frame then has to be opened again at an ImmichFrame address.',
    ),
    warning: i18n(
      'Every frame asks for the secret again until it is opened at an ImmichFrame address, or given the new secret.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: (await storeJson.read((s) => s.requireSecret).const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  async ({ effects }) => {
    const frameSecret = getRandomString(32)
    await storeJson.merge(effects, { frameSecret })
    return {
      version: '1',
      title: i18n('New Access Secret'),
      message: i18n(
        'Every ImmichFrame address now carries the new secret. Open one on each frame again.',
      ),
      result: {
        type: 'single',
        value: frameSecret,
        masked: true,
        copyable: true,
        qr: false,
        launchable: false,
      },
    }
  },
)
