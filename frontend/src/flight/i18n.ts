import i18n from '../i18n'
import en from './locales/en.json'
import uk from './locales/uk.json'

// The flight screen keeps its texts in its own namespace so the task stays inside
// src/flight/. Backend message codes (`event.*`, docs/api.md) are keys in these files.
export const FLIGHT_NS = 'flight'

i18n.addResourceBundle('en', FLIGHT_NS, en, true, true)
i18n.addResourceBundle('uk', FLIGHT_NS, uk, true, true)
