import { ExtendedVersion, T, utils, VersionRange } from '@start9labs/start-sdk'
import { createHash, randomBytes } from 'crypto'
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
export const immichMinVersion = '3.3.3:1'
export const immichVersionRange = `>=${immichMinVersion}`
// What ImmichFrame's docs list under API Key Permissions, plus user.read to learn which account Immich chose.
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
  'user.read',
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

export const immichRunning = async (effects: T.Effects) =>
  !!(await sdk.getStatus(effects, { packageId: IMMICH_ID }).once())?.started

export const newImmichKey = () => randomBytes(32).toString('base64url')

const immichKeyHash = (apiKey: string) =>
  createHash('sha256').update(apiKey).digest('hex')

// Only Immich releases whose form has a label take one.
export async function requestImmichAccess(
  effects: T.Effects,
  request: { apiKey: string; label: string | null },
) {
  await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'request-access',
    input: ({ spec }) => ({
      keyHash: immichKeyHash(request.apiKey),
      permissions: immichKeyPermissions,
      ...('label' in spec && request.label ? { label: request.label } : {}),
    }),
  })
}

// With no key, Immich revokes every key and request ImmichFrame holds.
export async function revokeImmichAccess(
  effects: T.Effects,
  apiKey: string | null,
) {
  await sdk.action.run({
    effects,
    packageId: IMMICH_ID,
    actionId: 'revoke-access',
    input: () => ({ keyHash: apiKey === null ? null : immichKeyHash(apiKey) }),
  })
}

// Immich answers 401 both while the request is pending and after a denial.
export async function immichKeyOwner(
  address: string,
  apiKey: string,
): Promise<{ id: string; email: string } | 'unapproved' | 'no-answer'> {
  const res = await fetch(`${immichUrl(address)}/api/users/me`, {
    headers: { 'x-api-key': apiKey },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)
  if (!res) return 'no-answer'
  if (res.status === 401) return 'unapproved'
  if (!res.ok)
    throw new Error(
      i18n('Immich answered ${status}', { status: String(res.status) }),
    )
  return res.json()
}
