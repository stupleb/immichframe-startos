import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  timeZone: Value.select({
    name: i18n('Time zone'),
    values: Object.fromEntries(
      ['UTC', ...Intl.supportedValuesOf('timeZone')].map((z) => [z, z]),
    ),
    default: 'UTC',
  }),
})

export const setTimeZone = sdk.Action.withInput(
  'set-time-zone',

  async () => ({
    name: i18n('Set Time Zone'),
    description: i18n(
      'Choose the time zone ImmichFrame shows calendar events in. The clock follows each frame’s own time zone. ImmichFrame restarts to apply it.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => ({
    timeZone: (await storeJson.read((s) => s.timeZone).once()) ?? 'UTC',
  }),

  async ({ effects, input }) => {
    await storeJson.merge(effects, { timeZone: input.timeZone })
  },
)
