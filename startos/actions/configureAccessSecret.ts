import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getRandomString } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  required: Value.toggle({
    name: i18n('Require access secret'),
    description: i18n(
      'On, every ImmichFrame address carries the secret, and a screen without it asks for it. Off, the slideshow is public: anyone who can reach ImmichFrame sees your photos.',
    ),
    default: true,
  }),
})

export const configureAccessSecret = sdk.Action.withInput(
  'configure-access-secret',

  async () => ({
    name: i18n('Configure Access Secret'),
    description: i18n(
      'Make the slideshow private, so it shows photos only at addresses that carry the access secret, or public, so anyone who can reach ImmichFrame sees it.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => ({
    required: (await storeJson.read((s) => s.requireSecret).once()) ?? true,
  }),

  async ({ effects, input }) => {
    if (!input.required) {
      // The secret stays stored, so requiring it again restores the one every frame already has.
      await storeJson.merge(effects, { requireSecret: false })
      return {
        version: '1',
        title: i18n('Slideshow Public'),
        message: i18n(
          'Anyone who can reach ImmichFrame can now see the slideshow. Requiring the secret again restores the same one, so your frames keep working.',
        ),
        result: null,
      }
    }

    const frameSecret =
      (await storeJson.read((s) => s.frameSecret).once()) || getRandomString(32)
    await storeJson.merge(effects, { requireSecret: true, frameSecret })
    return {
      version: '1',
      title: i18n('Access Secret Required'),
      message: i18n(
        'Every ImmichFrame address now carries this secret. A frame opened at one of them keeps it; a frame without it asks for it.',
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
