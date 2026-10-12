import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.object({
  adminPassword: z.string().nullable().catch(null),
  frameSecret: z.string().catch(''),
  requireSecret: z.boolean().catch(true),
  timeZone: z.string().catch('UTC'),
  immichConnections: z
    .array(
      z.object({
        immichUserId: z.string(),
        email: z.string(),
        keyId: z.string(),
        apiKey: z.string(),
      }),
    )
    .catch([]),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
