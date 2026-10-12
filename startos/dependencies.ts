import { storeJson } from './fileModels/store.json'
import { immichDescription } from './manifest/i18n'
import { sdk } from './sdk'
import { IMMICH_ID, immichVersionRange } from './utils'

export const dependencies = sdk.Dependencies.of().addDependency(
  sdk.Dependency.optional(IMMICH_ID, {
    description: immichDescription,
    metadata: {
      title: 'Immich',
      icon: 'https://raw.githubusercontent.com/Start9Labs/immich-startos/da17fb7111c995469eea10131aaf37caf43d4fd1/icon.svg',
    },
    versionRange: immichVersionRange,
    kind: 'running',
    healthChecks: [],
    enabled: async ({ effects }) =>
      !!(await storeJson
        .read((s) => s.immichConnections.length > 0)
        .const(effects)),
  }),
)
