import { sdk } from '../sdk'
import { connectImmich } from './connectImmich'
import { disconnectImmich } from './disconnectImmich'
import { manageSlideshows } from './manageSlideshows'

export const actions = sdk.Actions.of()
  .addAction(manageSlideshows)
  .addAction(connectImmich)
  .addAction(disconnectImmich)
