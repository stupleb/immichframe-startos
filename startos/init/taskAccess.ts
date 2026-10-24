import { manageAccess } from '../actions/manageAccess'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { manifest } from '../manifest'
import { sdk } from '../sdk'

export const taskAccess = sdk.setupOnInit(async (effects) => {
  const decided = await storeJson
    .read(
      (s) =>
        s.access === 'public' || (s.access === 'private' && !!s.frameSecret),
    )
    .const(effects)
  if (decided) {
    await sdk.action.clearTask(effects, `${manifest.id}:${manageAccess.id}`)
  } else {
    await sdk.action.createOwnTask(effects, manageAccess, 'critical', {
      reason: i18n(
        'Choose whether the slideshow needs the access secret. Private is the default.',
      ),
    })
  }
})
