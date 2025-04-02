import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translation files
import enGlobal from './locales/en/global.json';
import enDashboard from './locales/en/dashboard.json';
import enProperties from './locales/en/properties.json';
import enMortgages from './locales/en/mortgages.json';
import enAdmin from './locales/en/admin.json';
import enComponents from './locales/en/components.json';

import esGlobal from './locales/es/global.json';
import esDashboard from './locales/es/dashboard.json';
import esProperties from './locales/es/properties.json';
import esMortgages from './locales/es/mortgages.json';
import esAdmin from './locales/es/admin.json';
import esComponents from './locales/es/components.json';

export const resources = {
  en: {
    global: enGlobal,
    dashboard: enDashboard,
    properties: enProperties,
    mortgages: enMortgages,
    admin: enAdmin,
    components: enComponents,
  },
  es: {
    global: esGlobal,
    dashboard: esDashboard,
    properties: esProperties,
    mortgages: esMortgages,
    admin: esAdmin,
    components: esComponents,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'global',
    ns: ['global', 'dashboard', 'properties', 'mortgages', 'admin', 'components'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 