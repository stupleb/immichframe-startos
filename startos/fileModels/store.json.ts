import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  adminPassword: z.string().nullable().catch(null),
  // unset until the owner chooses in Manage Access
  access: z.enum(['private', 'public']).optional().catch(undefined),
  frameSecret: z.string().optional().catch(undefined),
  timeZone: z.string().catch('UTC'),
  immichConnections: z
    .array(
      z.looseObject({
        immichUserId: z.string(),
        email: z.string(),
        apiKey: z.string(),
      }),
    )
    .catch([]),
  immichRequest: z
    .looseObject({ apiKey: z.string(), label: z.string().nullable() })
    .nullable()
    .catch(null),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
