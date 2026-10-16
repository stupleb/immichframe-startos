import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.39.0:2',
  releaseNotes: {
    en_US:
      'Connect Immich sends a request that you approve in Immich’s tasks, where you also choose the account. Requires Immich 3.3.3:1 or later.',
    es_ES:
      'Conectar Immich envía una solicitud que apruebas en las tareas de Immich, donde también eliges la cuenta. Requiere Immich 3.3.3:1 o posterior.',
    de_DE:
      'Immich verbinden sendet eine Anfrage, die du in den Aufgaben von Immich genehmigst, wo du auch das Konto auswählst. Erfordert Immich 3.3.3:1 oder neuer.',
    pl_PL:
      'Połącz Immich wysyła prośbę, którą zatwierdzasz w zadaniach Immich, gdzie wybierasz też konto. Wymaga Immich 3.3.3:1 lub nowszego.',
    fr_FR:
      "Connecter Immich envoie une demande que vous approuvez dans les tâches d'Immich, où vous choisissez aussi le compte. Nécessite Immich 3.3.3:1 ou ultérieur.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
