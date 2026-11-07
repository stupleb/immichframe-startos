import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  immichBridgeAddress,
  immichKeyOwner,
  immichMinVersion,
  immichRunning,
  immichSupported,
  immichVersion,
  newImmichKey,
  requestImmichAccess,
  revokeImmichAccess,
  slideshowName,
  withImmichDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  label: Value.text({
    name: i18n('Immich Account Email'),
    description: i18n(
      'The email of the Immich account whose photos to show. Immich shows it with the request, so you choose that account when you approve.',
    ),
    required: false,
    default: null,
    maxLength: 64,
    inputmode: 'email',
    patterns: [
      {
        regex: '^[^\\s@<>]+@[^\\s@<>]+$',
        description: i18n('Must be an email address'),
      },
    ],
  }),
  slideshows: Value.dynamicMultiselect(async () => {
    const slideshows = (await storeJson.read((s) => s.slideshows).once()) ?? []
    return {
      name: i18n('Show on'),
      description: i18n(
        'The slideshows that show this person’s photos once you approve the request in Immich.',
      ),
      values: Object.fromEntries(
        slideshows.map((s) => [s.id, slideshowName(s.name)]),
      ),
      default: slideshows.length === 1 ? [slideshows[0].id] : [],
      minLength: 1,
    }
  }),
})

export const connectImmich = sdk.Action.withInput(
  'connect-immich',

  async ({ effects }) => {
    const version = await immichVersion(effects).const()
    return {
      name: i18n('Connect Immich'),
      description: i18n(
        'Ask Immich on this server to let slideshows show one person’s photos. You approve the request in Immich’s tasks and choose the account there. Run it once for each person. Choosing an account that is already connected replaces its key and keeps its slideshow settings.',
      ),
      warning: null,
      allowedStatuses: 'only-running',
      group: i18n('Immich'),
      visibility: !version
        ? 'hidden'
        : immichSupported(version)
          ? 'enabled'
          : {
              disabled: i18n('Requires Immich ${version} or later', {
                version: immichMinVersion,
              }),
            },
    }
  },

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    if (!(await immichRunning(effects)))
      throw new Error(i18n('Start Immich first'))
    const store = await storeJson.read().once()
    const previous = store?.immichRequest?.apiKey
    const slideshows = input.slideshows.filter((id) =>
      store?.slideshows.some((s) => s.id === id),
    )
    if (!slideshows.length)
      throw new Error(i18n('Choose at least one slideshow'))
    const request = {
      apiKey: newImmichKey(),
      label: input.label?.trim() || null,
      slideshows,
    }

    await withImmichDependency(effects, true, async () => {
      if (previous) {
        const address = await immichBridgeAddress(effects).once()
        if (!address)
          throw new Error(i18n('Immich has no address ImmichFrame can reach'))
        const owner = await immichKeyOwner(address, previous)
        if (owner === 'no-answer')
          throw new Error(i18n('Immich is not answering'))
        if (owner !== 'unapproved')
          throw new Error(
            i18n(
              'Immich has approved the previous request, and ImmichFrame is adding that account. Run Connect Immich again in a few seconds to add someone else.',
            ),
          )
        await revokeImmichAccess(effects, previous)
      }
      // Recorded first, so Immich never holds a request whose key ImmichFrame lost.
      await storeJson.merge(effects, { immichRequest: request })
      try {
        await requestImmichAccess(effects, request)
      } catch (e) {
        await storeJson.merge(effects, { immichRequest: null })
        throw e
      }
    })

    return {
      version: '1',
      title: i18n('Approve in Immich'),
      message: i18n(
        'Open Immich’s tasks, approve ImmichFrame’s request and choose whose photos to show. ImmichFrame then adds that account to the slideshows you chose, with its whole library. To add someone else, run Connect Immich again once this one is connected.',
      ),
      result: null,
    }
  },
)
