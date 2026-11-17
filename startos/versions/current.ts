import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.0.40.0:0',
  releaseNotes: {
    en_US:
      'ImmichFrame 1.0.40.0 adds birthday memories, shows the crops and rotations made in Immich, and displays correctly with memories turned on and on LG webOS TVs. An Immich server added on the admin page must run Immich 3.3.0 or newer.',
    es_ES:
      'ImmichFrame 1.0.40.0 añade los recuerdos de cumpleaños, muestra los recortes y giros hechos en Immich, y se ve correctamente con los recuerdos activados y en los televisores LG webOS. Un servidor Immich añadido en la página de administración debe usar Immich 3.3.0 o posterior.',
    de_DE:
      'ImmichFrame 1.0.40.0 bringt Geburtstagserinnerungen, zeigt die in Immich vorgenommenen Zuschnitte und Drehungen und wird mit aktivierten Erinnerungen sowie auf LG-webOS-Fernsehern korrekt angezeigt. Ein auf der Admin-Seite hinzugefügter Immich-Server muss Immich 3.3.0 oder neuer verwenden.',
    pl_PL:
      'ImmichFrame 1.0.40.0 dodaje wspomnienia urodzinowe, pokazuje przycięcia i obroty wykonane w Immich oraz wyświetla się poprawnie z włączonymi wspomnieniami i na telewizorach LG webOS. Serwer Immich dodany na stronie administracyjnej musi mieć Immich 3.3.0 lub nowszy.',
    fr_FR: `ImmichFrame 1.0.40.0 ajoute les souvenirs d'anniversaire, affiche les recadrages et rotations faits dans Immich, et s'affiche correctement avec les souvenirs activés et sur les téléviseurs LG webOS. Un serveur Immich ajouté sur la page d'administration doit utiliser Immich 3.3.0 ou une version plus récente.`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
