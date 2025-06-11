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
import enAccount from './locales/en/account.json';
import enRentals from './locales/en/rentals.json';

import esGlobal from './locales/es/global.json';
import esDashboard from './locales/es/dashboard.json';
import esProperties from './locales/es/properties.json';
import esMortgages from './locales/es/mortgages.json';
import esAdmin from './locales/es/admin.json';
import esComponents from './locales/es/components.json';
import esAccount from './locales/es/account.json';
import esRentals from './locales/es/rentals.json';

export const resources = {
  en: {
    global: enGlobal,
    dashboard: enDashboard,
    properties: enProperties,
    mortgages: enMortgages,
    admin: enAdmin,
    components: enComponents,
    account: enAccount,
    rentals: enRentals,
  },
  es: {
    global: esGlobal,
    dashboard: esDashboard,
    properties: esProperties,
    mortgages: esMortgages,
    admin: esAdmin,
    components: esComponents,
    account: esAccount,
    rentals: esRentals,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'global',
    ns: ['global', 'dashboard', 'properties', 'mortgages', 'admin', 'components', 'account', 'rentals'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n; 