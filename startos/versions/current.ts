import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.39.0:1',
  releaseNotes: {
    en_US: 'Connect Immich requires Immich 3.3.1:2 or later.',
    es_ES: 'Conectar Immich requiere Immich 3.3.1:2 o posterior.',
    de_DE: 'Immich verbinden erfordert Immich 3.3.1:2 oder neuer.',
    pl_PL: 'Połącz Immich wymaga Immich 3.3.1:2 lub nowszego.',
    fr_FR: 'Connecter Immich nécessite Immich 3.3.1:2 ou ultérieur.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
