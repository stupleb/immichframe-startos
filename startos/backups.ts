import { sdk } from './sdk'

// cache holds only photos ImmichFrame downloads again from Immich.
export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes('startos', 'config'),
)
