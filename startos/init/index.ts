import { sdk } from '../sdk'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { revokeOnUninstall } from './revokeOnUninstall'
import { seedFiles } from './seedFiles'
import { taskSlideshows } from './taskSlideshows'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  setInterfaces,
  actions,
  taskSlideshows,
  dependencies,
)

export const uninit = sdk.setupUninit(versionGraph, revokeOnUninstall)
