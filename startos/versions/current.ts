import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.39.0:3',
  releaseNotes: {
    en_US:
      'The instructions explain how to show everyone’s photos from a shared album, and which addresses the Android app can use.',
    es_ES:
      'Las instrucciones explican cómo mostrar las fotos de todos en un álbum compartido y qué direcciones puede usar la app de Android.',
    de_DE:
      'Die Anleitung erklärt, wie die Fotos aller Mitglieder eines geteilten Albums angezeigt werden und welche Adressen die Android-App nutzen kann.',
    pl_PL:
      'Instrukcja wyjaśnia, jak pokazać zdjęcia wszystkich osób z udostępnionego albumu i których adresów może używać aplikacja na Androida.',
    fr_FR:
      "Les instructions expliquent comment afficher les photos de tous dans un album partagé et quelles adresses l'application Android peut utiliser.",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
