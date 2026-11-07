import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { mainSlideshowId, uiPort } from '../utils'

const slideshow = z.looseObject({
  id: z.string(),
  name: z.string().nullable().catch(null),
  port: z.number(),
  access: z.enum(['private', 'public']).optional().catch(undefined),
  secret: z.string().optional().catch(undefined),
  adminPassword: z.string().optional().catch(undefined),
  timeZone: z.string().catch('UTC'),
  accounts: z.array(z.string()).catch([]),
})

export type Slideshow = z.infer<typeof slideshow>

const shape = z.looseObject({
  slideshows: z.array(slideshow).catch(() => [
    {
      id: mainSlideshowId,
      name: null,
      port: uiPort,
      timeZone: 'UTC',
      accounts: [],
    },
  ]),
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
    .looseObject({
      apiKey: z.string(),
      label: z.string().nullable(),
      slideshows: z.array(z.string()).catch([]),
    })
    .nullable()
    .catch(null),
})

const location = { base: sdk.volumes.startos, subpath: 'store.json' }

export const storeJson = FileHelper.json(location, shape)

// For migrations, which see store.json as an older release wrote it.
export const rawStoreJson = FileHelper.json(
  location,
  z.looseObject({}).catch({}),
)
