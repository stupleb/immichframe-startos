import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { slideshowIds, slideshowName } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const slideshows =
    (await storeJson
      .read((s) =>
        s.slideshows.map(({ id, name, port }) => ({ id, name, port })),
      )
      .const(effects)) ?? []

  return Promise.all(
    slideshows.map(async ({ id, name, port }) => {
      const ids = slideshowIds(id)
      const origin = await sdk.MultiHost.of(effects, ids.host).bindPort(port, {
        protocol: 'http',
      })
      const ui = sdk.createInterface(effects, {
        name: slideshowName(name),
        id: ids.ui,
        description: i18n('The photo slideshow to open on each frame'),
        type: 'ui',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '',
        query: {},
      })
      const admin = sdk.createInterface(effects, {
        name: name ? i18n('Admin (${name})', { name }) : i18n('Admin'),
        id: ids.admin,
        description: i18n(
          'Where you choose which photos the slideshow shows, and how',
        ),
        type: 'ui',
        masked: false,
        schemeOverride: null,
        username: null,
        path: '/admin',
        query: {},
      })
      return origin.export([ui, admin])
    }),
  )
})
