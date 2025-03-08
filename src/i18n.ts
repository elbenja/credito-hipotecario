import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "coming_soon": "COMING SOON",
      "analyze_scenarios": "Analyze different scenarios, and clearly understand your credit.",
      "get_early_access": "Get Early Access",
      "register_email": "Register your email to be notified and be among the first to access the beta version.",
      "notify_me": "Notify Me!",
      "privacy_notice": "We won't spam you and won't share your email. By clicking \"Notify Me\", you agree to our Terms of Service and Security Policy",
      "email_placeholder": "name@example.com",
      "success_title": "Thank you for your interest!",
      "success_message": "We've received your email and will notify you as soon as we launch the beta version.",
      "settings": "Settings",
      "appearance": "Appearance",
      "appearance_description": "Customize how the app looks and feels.",
      "theme": "Theme",
      "light": "Light",
      "dark": "Dark",
      "language": "Language",
      "language_description": "Choose your preferred language.",
      "display_language": "Display Language",
      "main": "Main",
      "dashboard": "Dashboard",
      "properties": "Properties",
      "amortizations": "Amortizations",
      "rentals": "Rentals",
      "coming": "Coming",
      "ai_chat": "AI Chat",
      "account": "Account",
      "billing": "Billing",
      "notifications": "Notifications",
      "log_out": "Log out"
    }
  },
  es: {
    translation: {
      "coming_soon": "PRONTO",
      "analyze_scenarios": "Analiza diferentes escenarios y comprende claramente tu crédito.",
      "get_early_access": "Acceso Anticipado",
      "register_email": "Registra tu correo para ser notificado y estar entre los primeros en acceder a la versión beta.",
      "notify_me": "¡Notifícame!",
      "privacy_notice": "No enviaremos spam ni compartiremos tu correo. Al hacer clic en \"Notifícame\", aceptas nuestros Términos de Servicio y Política de Seguridad",
      "email_placeholder": "nombre@ejemplo.com",
      "success_title": "¡Gracias por tu interés!",
      "success_message": "Hemos recibido tu correo y te notificaremos tan pronto lancemos la versión beta.",
      "settings": "Configuración",
      "appearance": "Apariencia",
      "appearance_description": "Personaliza el aspecto de la aplicación.",
      "theme": "Tema",
      "light": "Claro",
      "dark": "Oscuro",
      "language": "Idioma",
      "language_description": "Elige tu idioma preferido.",
      "display_language": "Idioma de visualización",
      "main": "Principal",
      "dashboard": "Dashboard",
      "properties": "Propiedades",
      "amortizations": "Amortizaciones",
      "rentals": "Alquileres",
      "coming": "Pronto",
      "ai_chat": "Chat IA",
      "account": "Cuenta",
      "billing": "Facturación",
      "notifications": "Notificaciones",
      "log_out": "Cerrar sesión"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n; 