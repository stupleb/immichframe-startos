import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v_1_0_39_0_5 } from './v1.0.39.0_5'

export const versionGraph = VersionGraph.of({
  current,
  other: [v_1_0_39_0_5],
})
