import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { readStorage, writeStorage } from '../lib/storage'
import en from './en.json'
import uk from './uk.json'
import gameEn from './game.en.json'
import gameUk from './game.uk.json'

// English is the main language, Ukrainian the second (D29). Backend message codes
// (docs/api.md) are i18n keys in these files.
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Українська' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

const LANGUAGE_KEY = 'smdg.language'
const stored = readStorage(LANGUAGE_KEY)
// First visit: Ukrainian browsers start in Ukrainian, everyone else in English.
const browserLanguage = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en'
const initial: LanguageCode =
  stored === 'uk' || stored === 'en' ? stored : browserLanguage.startsWith('uk') ? 'uk' : 'en'

void i18n.use(initReactI18next).init({
  resources: { en: { translation: { ...en, ...gameEn } }, uk: { translation: { ...uk, ...gameUk } } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = initial

export function setLanguage(code: LanguageCode): void {
  void i18n.changeLanguage(code)
  document.documentElement.lang = code
  writeStorage(LANGUAGE_KEY, code)
}

export default i18n
