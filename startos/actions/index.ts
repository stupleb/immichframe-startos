import { sdk } from '../sdk'
import { configureAccessSecret } from './configureAccessSecret'
import { connectImmich } from './connectImmich'
import { disconnectImmich } from './disconnectImmich'
import { resetAccessSecret } from './resetAccessSecret'
import { setAdminPassword } from './setAdminPassword'
import { setTimeZone } from './setTimeZone'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(configureAccessSecret)
  .addAction(resetAccessSecret)
  .addAction(setTimeZone)
  .addAction(connectImmich)
  .addAction(disconnectImmich)
