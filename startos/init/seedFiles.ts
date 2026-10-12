import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { getRandomString } from '../utils'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  await storeJson.merge(
    effects,
    kind === 'install' ? { frameSecret: getRandomString(32) } : {},
  )
})
