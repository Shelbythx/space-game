import i18n from '../i18n'
import en from './locales/en.json'
import uk from './locales/uk.json'

// Report texts live in their own i18n namespace so task 011 stays inside src/report/.
// Keys repeat the backend message codes from docs/api.md (`check.*`, `chain.*`, …).
export const REPORT_NS = 'report'

i18n.addResourceBundle('en', REPORT_NS, en, true, true)
i18n.addResourceBundle('uk', REPORT_NS, uk, true, true)
