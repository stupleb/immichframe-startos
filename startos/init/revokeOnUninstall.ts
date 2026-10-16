import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { revokeImmichAccess } from '../utils'

// Fails while Immich is stopped; Immich then revokes the keys itself at its next start.
export const revokeOnUninstall = sdk.setupOnUninit(async (effects, target) => {
  if (target) return
  const store = await storeJson.read().once()
  if (!store?.immichConnections.length && !store?.immichRequest) return
  await revokeImmichAccess(effects, null).catch((e) =>
    console.error(`Could not revoke ImmichFrame's access to Immich: ${e}`),
  )
})
