import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  createImmichKey,
  deleteImmichKey,
  IMMICH_ID,
  immichBridgeAddress,
  immichSupported,
  immichUrl,
  immichVersion,
  listImmichUsers,
  readSettings,
  testAccount,
  withImmichDependency,
  writeSettings,
} from '../utils'

const { InputSpec, Value } = sdk

const immichRunning = async (effects: Parameters<typeof immichVersion>[0]) =>
  !!(await sdk.getStatus(effects, { packageId: IMMICH_ID }).once())?.started

const inputSpec = InputSpec.of({
  userId: Value.dynamicSelect(async ({ effects }) => ({
    name: i18n('Immich account'),
    description: i18n('Whose photos the slideshow shows.'),
    values: Object.fromEntries(
      (await immichRunning(effects))
        ? (
            await withImmichDependency(effects, false, () =>
              listImmichUsers(effects),
            )
          ).map((u) => [u.id, u.email])
        : [],
    ),
    default: null,
  })),
})

export const connectImmich = sdk.Action.withInput(
  'connect-immich',

  async ({ effects }) => {
    const version = await immichVersion(effects).const()
    return {
      name: i18n('Connect Immich'),
      description: i18n(
        'Add an Immich account on this server to the slideshow, using a new Immich API key that can only view that account’s library. Connecting an account again replaces its key and keeps its slideshow settings.',
      ),
      warning: null,
      allowedStatuses: 'only-running',
      group: i18n('Immich'),
      visibility: !version
        ? 'hidden'
        : immichSupported(version)
          ? 'enabled'
          : { disabled: i18n('Requires Immich 3.3.1:2 or later') },
    }
  },

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    if (!(await immichRunning(effects)))
      throw new Error(i18n('Start Immich first'))
    const store = await storeJson.read().once()
    if (!store?.adminPassword) throw new Error(i18n('No admin password is set'))
    const { adminPassword, immichConnections } = store
    const address = await immichBridgeAddress(effects).once()
    if (!address)
      throw new Error(i18n('Immich has no address ImmichFrame can reach'))

    const email = await withImmichDependency(effects, true, async () => {
      const user = (await listImmichUsers(effects)).find(
        (u) => u.id === input.userId,
      )
      if (!user) throw new Error(i18n('That Immich account no longer exists'))
      const key = await createImmichKey(effects, user.id)
      const discardKey = () =>
        deleteImmichKey(effects, user.id, key.id).catch((e) =>
          console.error(`Could not delete the unused Immich key: ${e}`),
        )
      const replaced = immichConnections.find((c) => c.immichUserId === user.id)
      try {
        const test = await testAccount(adminPassword, {
          immichServerUrl: immichUrl(address),
          apiKey: key.secret,
        })
        if (!test.success)
          throw new Error(
            i18n('ImmichFrame could not reach Immich: ${detail}', {
              detail: test.message,
            }),
          )
        const settings = await readSettings(adminPassword)
        const existing = settings.Accounts.find(
          (a) => replaced && a.apiKey === replaced.apiKey,
        )
        if (existing) {
          existing.immichServerUrl = immichUrl(address)
          existing.apiKey = key.secret
        } else {
          settings.Accounts.push({
            immichServerUrl: immichUrl(address),
            apiKey: key.secret,
          })
        }
        await writeSettings(adminPassword, settings)
      } catch (e) {
        await discardKey()
        throw e
      }
      await storeJson.merge(effects, {
        immichConnections: [
          ...immichConnections.filter((c) => c !== replaced),
          {
            immichUserId: user.id,
            email: user.email,
            keyId: key.id,
            apiKey: key.secret,
          },
        ],
      })
      if (replaced)
        await deleteImmichKey(effects, user.id, replaced.keyId).catch((e) =>
          console.error(`Could not delete the replaced Immich key: ${e}`),
        )
      return user.email
    })

    return {
      version: '1',
      title: i18n('Immich Connected'),
      message: i18n(
        'The slideshow now includes ${email}’s whole library. To narrow it to albums, people or tags, edit the account on the ImmichFrame admin page. Immich lists the key as “ImmichFrame” among that account’s API keys.',
        { email },
      ),
      result: null,
    }
  },
)
