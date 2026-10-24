import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'

export const current = VersionInfo.of({
  version: '1.0.39.0:5',
  releaseNotes: {
    en_US:
      'Manage Access makes the slideshow private, behind the access secret, or public, and replaces Configure Access Secret and Reset Access Secret. A new install asks you to choose; an existing install keeps its current access and secret.',
    es_ES:
      'Gestionar acceso hace la presentación privada, protegida por el secreto de acceso, o pública, y sustituye a Configurar el secreto de acceso y Restablecer el secreto de acceso. Una instalación nueva te pide elegir; una instalación existente conserva su acceso y su secreto actuales.',
    de_DE:
      '„Zugriff verwalten“ macht die Diashow privat, geschützt durch das Zugangsgeheimnis, oder öffentlich und ersetzt „Zugangsgeheimnis konfigurieren“ und „Zugangsgeheimnis zurücksetzen“. Eine neue Installation fragt dich nach deiner Wahl; eine bestehende Installation behält ihren aktuellen Zugriff und ihr Geheimnis.',
    pl_PL:
      '„Zarządzaj dostępem” ustawia pokaz slajdów jako prywatny, chroniony sekretem dostępu, albo publiczny, i zastępuje akcje „Skonfiguruj sekret dostępu” i „Zresetuj sekret dostępu”. Nowa instalacja prosi o wybór; istniejąca instalacja zachowuje obecny dostęp i sekret.',
    fr_FR: `« Gérer l'accès » rend le diaporama privé, protégé par le secret d'accès, ou public, et remplace « Configurer le secret d'accès » et « Réinitialiser le secret d'accès ». Une nouvelle installation vous demande de choisir ; une installation existante conserve son accès et son secret actuels.`,
  },
  migrations: {
    up: async ({ effects }) => {
      const store = await storeJson.read().once()
      if (!store) return
      const { requireSecret, ...rest } = store
      await storeJson.write(effects, {
        ...rest,
        access: requireSecret === false ? 'public' : 'private',
        frameSecret: rest.frameSecret || undefined,
      })
    },
    down: IMPOSSIBLE,
  },
})
