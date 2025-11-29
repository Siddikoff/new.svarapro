import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enErrors from '../locales/en/errors.json';
import ruErrors from '../locales/ru/errors.json';
import enCommon from '../locales/en/common.json';
import ruCommon from '../locales/ru/common.json';

i18n.use(initReactI18next).init({
  lng: 'ru',
  fallbackLng: 'ru',
  ns: ['common', 'errors'],
  defaultNS: 'common',
  resources: {
    en: { common: enCommon, errors: enErrors },
    ru: { common: ruCommon, errors: ruErrors }
  },
  interpolation: {
    escapeValue: false
  }
});
