import { manageSlideshows } from '../actions/manageSlideshows'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { manifest } from '../manifest'
import { sdk } from '../sdk'

export const taskSlideshows = sdk.setupOnInit(async (effects) => {
  const decided = await storeJson
    .read((s) =>
      s.slideshows.every(
        (sl) => !!sl.adminPassword && (sl.access === 'public' || !!sl.secret),
      ),
    )
    .const(effects)
  if (decided) {
    await sdk.action.clearTask(effects, `${manifest.id}:${manageSlideshows.id}`)
  } else {
    await sdk.action.createOwnTask(effects, manageSlideshows, 'critical', {
      reason: i18n(
        'Create the slideshow’s admin password and choose whether it needs the access secret.',
      ),
    })
  }
})
