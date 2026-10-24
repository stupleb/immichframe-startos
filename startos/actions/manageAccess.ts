import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getRandomString } from '../utils'

const { InputSpec, Value, Variants } = sdk

const inputSpec = InputSpec.of({
  access: Value.union({
    name: i18n('Access'),
    description: i18n(
      '- Private: a screen shows photos only when opened at a Slideshow address, which carries the access secret, or once the secret is typed in\n- Public: anyone who can reach ImmichFrame sees your photos',
    ),
    default: 'private',
    variants: Variants.of({
      private: {
        name: i18n('Private (require the access secret)'),
        spec: InputSpec.of({
          newSecret: Value.toggle({
            name: i18n('Generate a new secret'),
            description: i18n(
              'Replace the current secret, for example after losing a frame. Every frame then asks for it until it opens a Slideshow address again, or is given the new secret. A secret is always generated the first time the slideshow is made private.',
            ),
            default: false,
          }),
        }),
      },
      public: { name: i18n('Public'), spec: InputSpec.of({}) },
    }),
  }),
})

export const manageAccess = sdk.Action.withInput(
  'manage-access',

  async () => ({
    name: i18n('Manage Access'),
    description: i18n(
      'Make the slideshow private, so a screen needs the access secret to show photos, or public.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () =>
    (await storeJson.read((s) => s.access).once()) === 'public'
      ? { access: { selection: 'public' as const, value: {} } }
      : {
          access: {
            selection: 'private' as const,
            value: { newSecret: false },
          },
        },

  async ({ effects, input }) => {
    if (input.access.selection === 'public') {
      await storeJson.merge(effects, { access: 'public' })
      return {
        version: '1',
        title: i18n('Slideshow Public'),
        message: i18n(
          'Anyone who can reach ImmichFrame can now see the slideshow. Making it private again keeps the same secret, so your frames keep working.',
        ),
        result: null,
      }
    }

    const stored = await storeJson.read((s) => s.frameSecret).once()
    if (stored && !input.access.value.newSecret) {
      await storeJson.merge(effects, { access: 'private' })
      return {
        version: '1',
        title: i18n('Slideshow Private'),
        message: i18n(
          'Every Slideshow address carries the access secret, which has not changed.',
        ),
        result: null,
      }
    }

    const frameSecret = getRandomString(32)
    await storeJson.merge(effects, { access: 'private', frameSecret })
    return {
      version: '1',
      title: i18n('New Access Secret'),
      message: i18n(
        'Every Slideshow address now carries this secret. Open one on each frame, or type the secret on a frame that asks for it. It is not shown here again, but stays part of every Slideshow address.',
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
