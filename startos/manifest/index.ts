import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'immichframe',
  title: 'ImmichFrame',
  license: 'GPL-3.0',
  packageRepo: 'https://github.com/stupleb/immichframe-startos',
  upstreamRepo: 'https://github.com/immichFrame/ImmichFrame',
  marketingUrl: 'https://immichframe.dev',
  donationUrl: null,
  description: { short, long },
  volumes: ['startos', 'config', 'cache'],
  images: {
    immichframe: {
      source: {
        dockerTag:
          'ghcr.io/immichframe/immichframe:v1.0.40.0@sha256:907902c8be42629ea71b13e5f5b7996d83f2420270e2c404ebf282d2fd00c39a',
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
