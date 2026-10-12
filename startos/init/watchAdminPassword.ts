import { setAdminPassword } from '../actions/setAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { manifest } from '../manifest'
import { sdk } from '../sdk'

// The SDK's default replay key for createOwnTask.
const passwordTask = `${manifest.id}:${setAdminPassword.id}`

export const watchAdminPassword = sdk.setupOnInit(async (effects) => {
  if (await storeJson.read((s) => s.adminPassword).const(effects)) {
    await sdk.action.clearTask(effects, passwordTask)
  } else {
    await sdk.action.createOwnTask(effects, setAdminPassword, 'critical', {
      reason: i18n(
        'Create the password for the ImmichFrame admin page, where you add Immich accounts and choose what the slideshow shows.',
      ),
    })
  }
})
