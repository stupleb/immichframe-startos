import { z } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { Slideshow, storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  freePort,
  mainSlideshowId,
  newSlideshowId,
  slideshowIds,
} from '../utils'

const { InputSpec, Value, List } = sdk

const secretSpec = { charset: 'a-z,A-Z,0-9', len: 32 }
const passwordSpec = { charset: 'a-z,A-Z,0-9', len: 24 }

const inputSpec = InputSpec.of({
  offeredAccounts: Value.hidden(z.array(z.string()).nullable().catch(null)),
  slideshows: Value.list(
    List.obj(
      { name: i18n('Slideshows'), minLength: 1 },
      {
        displayAs: `{{#name}}{{name}}{{/name}}{{^name}}${i18n('Slideshow')}{{/name}}`,
        spec: InputSpec.of({
          id: Value.hidden(z.string().nullable()),
          name: Value.text({
            name: i18n('Name'),
            description: i18n(
              'Names the slideshow’s interfaces, like “Slideshow (Tablet)”. Every slideshow you add needs one. Renaming restarts this slideshow only.',
            ),
            required: false,
            default: null,
            maxLength: 64,
            patterns: [
              { regex: '^[^<>]*$', description: i18n('Cannot contain < or >') },
            ],
          }),
          access: Value.select({
            name: i18n('Access'),
            description: i18n(
              '- Private: a screen shows photos only once this slideshow’s access secret is entered on it\n- Public: anyone who can reach this slideshow sees its photos',
            ),
            default: 'private',
            values: {
              private: i18n('Private (require the access secret)'),
              public: i18n('Public'),
            },
          }),
          secret: Value.text({
            name: i18n('Access Secret'),
            description: i18n(
              'Enter it once on each of this slideshow’s frames: in the ImmichFrame app’s secret field, or on the page a browser shows. It is kept while the slideshow is public. Generate a new one after losing a frame; every frame of this slideshow then needs the new one.',
            ),
            required: true,
            default: secretSpec,
            generate: secretSpec,
            masked: true,
            patterns: [
              {
                regex: '^[!-~]{32,}$',
                description: i18n(
                  'At least 32 characters: unaccented letters, digits and symbols, without spaces',
                ),
              },
            ],
          }),
          adminPassword: Value.text({
            name: i18n('Admin Password'),
            description: i18n(
              'Signs in on this slideshow’s Admin interface, and no other. Changing it restarts this slideshow only.',
            ),
            required: true,
            default: passwordSpec,
            generate: passwordSpec,
            masked: true,
            patterns: [
              {
                regex: '^[!-~]{12,}$',
                description: i18n(
                  'At least 12 characters: unaccented letters, digits and symbols, without spaces',
                ),
              },
            ],
          }),
          timeZone: Value.dynamicSelect(async () => ({
            name: i18n('Time Zone'),
            description: i18n(
              'The time zone this slideshow shows calendar events in. The clock follows each frame’s own time zone. Changing it restarts this slideshow only.',
            ),
            values: Object.fromEntries(
              ['UTC', ...Intl.supportedValuesOf('timeZone')].map((z) => [z, z]),
            ),
            default:
              (await storeJson
                .read(
                  (s) =>
                    s.slideshows.find((sl) => sl.id === mainSlideshowId)
                      ?.timeZone,
                )
                .once()) ?? 'UTC',
          })),
          accounts: Value.dynamicMultiselect(async () => ({
            name: i18n('Immich accounts'),
            description: i18n(
              'The accounts added by Connect Immich whose photos this slideshow shows. Choose which of their photos on this slideshow’s Admin interface.',
            ),
            values: Object.fromEntries(
              (
                (await storeJson.read((s) => s.immichConnections).once()) ?? []
              ).map((c) => [c.immichUserId, c.email]),
            ),
            default: [],
          })),
        }),
      },
    ),
  ),
})

export const manageSlideshows = sdk.Action.withInput(
  'manage-slideshows',

  async () => ({
    name: i18n('Manage Slideshows'),
    description: i18n(
      'Add, rename and remove slideshows, each with its own photos, display settings and addresses, and choose whether each one needs its access secret.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const store = await storeJson.read().once()
    return {
      offeredAccounts: (store?.immichConnections ?? []).map(
        (c) => c.immichUserId,
      ),
      slideshows: (store?.slideshows ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        access: s.access ?? 'private',
        ...(s.secret && { secret: s.secret }),
        ...(s.adminPassword && { adminPassword: s.adminPassword }),
        timeZone: s.timeZone,
        accounts: s.accounts,
      })),
    }
  },

  async ({ effects, input }) => {
    const entries = [
      ...input.slideshows.filter((s) => s.id === mainSlideshowId),
      ...input.slideshows.filter((s) => s.id !== mainSlideshowId),
    ]
    if (entries[0]?.id !== mainSlideshowId)
      throw new Error(
        i18n(
          'Your first slideshow, the one ImmichFrame came with, cannot be removed',
        ),
      )
    const ids = entries.map((s) => s.id).filter(Boolean)
    if (new Set(ids).size !== ids.length)
      throw new Error(i18n('Two slideshows share an ID'))
    const names = entries.map((s) => s.name?.trim() || null)
    if (entries.some((s, i) => s.id !== mainSlideshowId && !names[i]))
      throw new Error(i18n('Every slideshow you add needs a name'))
    if (new Set(names.filter(Boolean)).size !== names.filter(Boolean).length)
      throw new Error(i18n('Every slideshow needs a different name'))

    let removed: Slideshow[] = []
    await storeJson.update(effects, (s) => {
      if (!s) return null
      const connected = s.immichConnections.map((c) => c.immichUserId)
      const offered = input.offeredAccounts ?? connected
      const usedPorts = s.slideshows
        .filter((p) => entries.some((e) => e.id === p.id))
        .map((p) => p.port)
      const slideshows = entries.map((e, i) => {
        const old = s.slideshows.find((p) => p.id === e.id)
        const port = old?.port ?? freePort(usedPorts)
        usedPorts.push(port)
        return {
          id: (old && e.id) || newSlideshowId(),
          name: names[i],
          port,
          access: e.access,
          secret: e.secret,
          adminPassword: e.adminPassword,
          timeZone: e.timeZone,
          accounts: [
            ...e.accounts.filter((a) => connected.includes(a)),
            // An approval that landed after the form opened isn't in it.
            ...(old?.accounts ?? []).filter(
              (a) =>
                connected.includes(a) &&
                !offered.includes(a) &&
                !e.accounts.includes(a),
            ),
          ],
        }
      })
      removed = s.slideshows.filter(
        (p) => !slideshows.some((n) => n.id === p.id),
      )
      return {
        ...s,
        slideshows,
        immichRequest: s.immichRequest && {
          ...s.immichRequest,
          slideshows: s.immichRequest.slideshows.filter((id) =>
            slideshows.some((n) => n.id === id),
          ),
        },
      }
    })

    for (const { id } of removed) {
      const { host, subpath } = slideshowIds(id)
      if (!subpath) continue
      await sdk.MultiHost.of(effects, host).retire()
      // The removed server may still be writing while the reconciler stops it.
      for (const volume of [sdk.volumes.config, sdk.volumes.cache])
        await rm(volume.subpath(subpath), {
          recursive: true,
          force: true,
          maxRetries: 10,
          retryDelay: 500,
        })
    }

    return {
      version: '1',
      title: i18n('Slideshows Saved'),
      message: i18n(
        'Each slideshow has its own Slideshow and Admin interfaces. Sign in on a slideshow’s Admin interface with its own admin password to choose its photos.',
      ),
      result: null,
    }
  },
)
