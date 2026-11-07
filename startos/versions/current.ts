import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { rawStoreJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { mainSlideshowId, uiPort } from '../utils'

export const current = VersionInfo.of({
  version: '1.0.39.0:6',
  releaseNotes: {
    en_US:
      'Manage Slideshows adds slideshows, each with its own photos, display settings, addresses, access secret, admin password and time zone, and replaces Manage Access, Set Admin Password and Set Time Zone. Frames already set up keep working; on a new frame, enter the access secret from Manage Slideshows.',
    es_ES:
      'Gestionar presentaciones añade presentaciones, cada una con sus propias fotos, ajustes de pantalla, direcciones, secreto de acceso, contraseña de administrador y zona horaria, y sustituye a Gestionar acceso, Establecer contraseña de administrador y Establecer zona horaria. Los marcos ya configurados siguen funcionando; en un marco nuevo, introduce el secreto de acceso de Gestionar presentaciones.',
    de_DE:
      '„Diashows verwalten“ fügt Diashows hinzu, jede mit eigenen Fotos, Anzeigeeinstellungen, Adressen, Zugangsgeheimnis, Admin-Passwort und Zeitzone, und ersetzt „Zugriff verwalten“, „Admin-Passwort festlegen“ und „Zeitzone festlegen“. Bereits eingerichtete Bilderrahmen funktionieren weiter; gib auf einem neuen Bilderrahmen das Zugangsgeheimnis aus „Diashows verwalten“ ein.',
    pl_PL:
      '„Zarządzaj pokazami slajdów” dodaje pokazy slajdów, każdy z własnymi zdjęciami, ustawieniami wyświetlania, adresami, sekretem dostępu, hasłem administratora i strefą czasową, oraz zastępuje „Zarządzaj dostępem”, „Ustaw hasło administratora” i „Ustaw strefę czasową”. Ramki już skonfigurowane działają dalej; na nowej ramce wpisz sekret dostępu z „Zarządzaj pokazami slajdów”.',
    fr_FR: `« Gérer les diaporamas » ajoute des diaporamas, chacun avec ses propres photos, réglages d'affichage, adresses, secret d'accès, mot de passe d'administration et fuseau horaire, et remplace « Gérer l'accès », « Définir le mot de passe d'administration » et « Définir le fuseau horaire ». Les cadres déjà configurés continuent de fonctionner ; sur un nouveau cadre, saisissez le secret d'accès indiqué dans « Gérer les diaporamas ».`,
  },
  migrations: {
    up: async ({ effects }) => {
      const store = await rawStoreJson.read().once()
      if (!store) return
      const {
        adminPassword,
        timeZone,
        access,
        frameSecret,
        immichConnections,
        immichRequest,
        ...rest
      } = store as {
        adminPassword?: string | null
        timeZone?: string
        access?: 'private' | 'public'
        frameSecret?: string
        immichConnections?: { immichUserId: string }[]
        immichRequest?: Record<string, unknown> | null
      }
      await rawStoreJson.write(effects, {
        ...rest,
        immichConnections,
        immichRequest: immichRequest && {
          ...immichRequest,
          slideshows: [mainSlideshowId],
        },
        slideshows: [
          {
            id: mainSlideshowId,
            name: null,
            port: uiPort,
            access,
            secret: frameSecret,
            adminPassword: adminPassword ?? undefined,
            timeZone: timeZone ?? 'UTC',
            accounts: (immichConnections ?? []).map((c) => c.immichUserId),
          },
        ],
      })
      await sdk.action.clearTask(effects, 'immichframe:manage-access')
      await sdk.action.clearTask(effects, 'immichframe:set-admin-password')
    },
    down: IMPOSSIBLE,
  },
})
