import { ExtendedVersion, T, utils, VersionRange } from '@start9labs/start-sdk'
import {
  uiHostId as immichHostId,
  uiPort as immichPort,
} from 'immich-startos/startos/utils'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const uiPort = 8080
export const uiHostId = 'ui-multi'
export const uiInterfaceId = 'ui'

export const configPath = '/app/Config'
export const cachePath = '/app/ImageCache'

export const IMMICH_ID = 'immich'
export const immichVersionRange = '>=3.3.1:1'
// What ImmichFrame's docs list under API Key Permissions.
const immichKeyPermissions = [
  'album.read',
  'album.statistics',
  'asset.read',
  'asset.statistics',
  'asset.view',
  'face.read',
  'memory.read',
  'person.read',
  'person.statistics',
  'tag.read',
]

export const getRandomString = (len: number) =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len })

type FrameAccount = Record<string, unknown> & {
  immichServerUrl: string
  apiKey: string
}
type FrameSettings = {
  General: Record<string, unknown> & { authenticationSecret?: string | null }
  Accounts: FrameAccount[]
}

async function adminApi<R>(
  adminPassword: string,
  path: string,
  init: { method: 'GET' | 'PUT' | 'POST'; body?: unknown } = { method: 'GET' },
): Promise<R> {
  const res = await fetch(`http://127.0.0.1:${uiPort}/api/Admin/${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${adminPassword}`,
      'Content-Type': 'application/json',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok)
    throw new Error(
      i18n('ImmichFrame refused the request: ${detail}', {
        detail: (await res.text()) || String(res.status),
      }),
    )
  return res.json()
}

export const readSettings = (adminPassword: string) =>
  adminApi<FrameSettings>(adminPassword, 'Settings')

export const writeSettings = (adminPassword: string, settings: FrameSettings) =>
  adminApi<{ warnings: string[] }>(adminPassword, 'Settings', {
    method: 'PUT',
    body: settings,
  })

export const testAccount = (
  adminPassword: string,
  account: { immichServerUrl: string; apiKey: string },
) =>
  adminApi<{ success: boolean; message: string }>(
    adminPassword,
    'Settings/TestAccount',
    { method: 'POST', body: account },
  )

export function immichVersion(effects: T.Effects) {
  return sdk.getServiceManifest(effects, IMMICH_ID, (m) => m?.version ?? null)
}

export function immichSupported(version: string) {
  return ExtendedVersion.parse(version).satisfies(
    VersionRange.parse(immichVersionRange),
  )
}

export function immichBridgeAddress(effects: T.Effects) {
  return sdk.host.getBridgeAddress(effects, {
    packageId: IMMICH_ID,
    hostId: immichHostId,
    internalPort: immichPort,
    ssl: false,
  })
}

export const immichUrl = (address: string) => `http://${address}`

// Immich's actions admit only a declared dependent. `keep` leaves Immich declared once fn succeeds.
export async function withImmichDependency<R>(
  effects: T.Effects,
  keep: boolean,
  fn: () => Promise<R>,
): Promise<R> {
  const previous = await effects.getDependencies()
  const declared = previous.some((d) => d.id === IMMICH_ID)
  if (!declared)
    await effects.setDependencies({
      dependencies: [
        ...previous,
        {
          id: IMMICH_ID,
          kind: 'running',
          versionRange: immichVersionRange,
          healthChecks: [],
        },
      ],
    })
  try {
    const result = await fn()
    if (!keep && !declared)
      await effects.setDependencies({ dependencies: previous })
    return result
  } catch (e) {
    if (!declared) await effects.setDependencies({ dependencies: previous })
    throw e
  }
}

export async function listImmichUsers(
  effects: T.Effects,
): Promise<{ id: string; email: string }[]> {
  // sdk.action.run sends no `input` for an action without one, which StartOS rejects.
  const res = await effects.action.run({
    packageId: IMMICH_ID,
    actionId: 'list-users',
    input: {},
  })
  return res?.version === '1' && res.result?.type === 'group'
    ? res.result.value.flatMap((m) =>
        m.type === 'single' ? [{ id: m.value, email: m.name }] : [],
      )
    : []
}

export async function createImmichKey(
  effects: T.Effects,
  userId: string,
): Promise<{ secret: string; id: string }> {
  const res = await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'create-api-key',
    input: () => ({
      userId,
      name: 'ImmichFrame',
      permissions: immichKeyPermissions,
    }),
  })
  const fields: Record<string, string> = Object.fromEntries(
    res?.version === '1' && res.result?.type === 'group'
      ? res.result.value.flatMap((m) =>
          m.type === 'single' ? [[m.name, m.value]] : [],
        )
      : [],
  )
  if (!fields.secret || !fields.id)
    throw new Error(i18n('Immich did not return an API key'))
  return { secret: fields.secret, id: fields.id }
}

// Succeeds when the key is already gone.
export async function deleteImmichKey(
  effects: T.Effects,
  userId: string,
  keyId: string,
) {
  await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'delete-api-key',
    input: () => ({ userId, keyId }),
  })
}
