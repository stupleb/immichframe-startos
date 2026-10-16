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
  withImmichDependency,
} from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  label: Value.text({
    name: i18n('Who is it for?'),
    description: i18n(
      'Shown with the request in Immich, so you choose the right account there.',
    ),
    required: false,
    default: null,
    maxLength: 64,
    patterns: [
      { regex: '^[^<>]*$', description: i18n('Cannot contain < or >') },
    ],
  }),
})

export const connectImmich = sdk.Action.withInput(
  'connect-immich',

  async ({ effects }) => {
    const version = await immichVersion(effects).const()
    return {
      name: i18n('Connect Immich'),
      description: i18n(
        'Ask Immich on this server to let the slideshow show one person’s photos. You approve the request in Immich’s tasks and choose the account there. Run it once for each person. Choosing an account that is already connected replaces its key and keeps its slideshow settings.',
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
    const previous = await storeJson.read((s) => s.immichRequest?.apiKey).once()
    const request = {
      apiKey: newImmichKey(),
      label: input.label?.trim() || null,
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
        'Open Immich’s tasks, approve ImmichFrame’s request and choose whose photos to show. ImmichFrame then adds that account to the slideshow, with its whole library. To add someone else, run Connect Immich again once this one is connected.',
      ),
      result: null,
    }
  },
)
