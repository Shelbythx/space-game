import i18n from '../i18n'
import en from './locales/en.json'
import uk from './locales/uk.json'

// Rendezvous texts (task 024) in their own namespace; shared playback words come from
// the `flight` namespace (task 010).
export const RV_NS = 'rendezvous'

i18n.addResourceBundle('en', RV_NS, en, true, true)
i18n.addResourceBundle('uk', RV_NS, uk, true, true)
