import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiHostId, uiInterfaceId, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const frameSecret = await storeJson
    .read((s) => (s.access !== 'public' && s.frameSecret) || null)
    .const(effects)
  const uiMulti = sdk.MultiHost.of(effects, uiHostId)
  const uiMultiOrigin = await uiMulti.bindPort(uiPort, { protocol: 'http' })
  const ui = sdk.createInterface(effects, {
    name: i18n('Slideshow'),
    id: uiInterfaceId,
    description: i18n('The photo slideshow to open on each frame'),
    type: 'ui',
    masked: !!frameSecret,
    schemeOverride: null,
    username: null,
    path: '',
    query: frameSecret ? { authsecret: frameSecret } : {},
  })

  const admin = sdk.createInterface(effects, {
    name: i18n('Admin'),
    id: 'admin',
    description: i18n(
      'Where you add Immich accounts and choose which photos the slideshow shows, and how',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '/admin',
    query: {},
  })

  return [await uiMultiOrigin.export([ui, admin])]
})
