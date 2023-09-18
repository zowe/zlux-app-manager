import * as i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { MVDResources } from '../../mvd-resources';

const en = {translation: {}}

const ja = {translation: {}}

const lang = 'userLanguage';
const resources = {
  en,
  ja
};

i18next.use(initReactI18next).use(LanguageDetector).init({
  resources,
  interpolation: { escapeValue: false },
  lng: window.ZoweZLUX.globalization.getLanguage(),
  fallbackLng: 'en',
  defaultNS: 'translation',
  fallbackNS: 'translation',
  ns: ['translation'],
  nonExplicitWhitelist: true,
  whitelist: ['en', 'ja'],
});

export default i18next;
