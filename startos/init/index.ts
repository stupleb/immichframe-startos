import { sdk } from '../sdk'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { revokeOnUninstall } from './revokeOnUninstall'
import { seedFiles } from './seedFiles'
import { taskAccess } from './taskAccess'
import { watchAdminPassword } from './watchAdminPassword'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  setInterfaces,
  actions,
  watchAdminPassword,
  taskAccess,
  dependencies,
)

export const uninit = sdk.setupUninit(versionGraph, revokeOnUninstall)
