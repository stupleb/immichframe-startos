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
        dockerBuild: {
          buildArgs: {
            IMAGE:
              'ghcr.io/immichframe/immichframe:v1.0.39.0@sha256:b4bd2ac6ec75c0117a24bd627dc0b449d485ac87ec3a410c73d5db05a4bbfcaf',
          },
        },
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
