import { sdk } from '../sdk'
import { connectImmich } from './connectImmich'
import { disconnectImmich } from './disconnectImmich'
import { manageAccess } from './manageAccess'
import { setAdminPassword } from './setAdminPassword'
import { setTimeZone } from './setTimeZone'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(manageAccess)
  .addAction(setTimeZone)
  .addAction(connectImmich)
  .addAction(disconnectImmich)
