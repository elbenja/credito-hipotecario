import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'global';
    resources: {
      global: typeof import('../i18n/locales/en/global.json');
      dashboard: typeof import('../i18n/locales/en/dashboard.json');
      properties: typeof import('../i18n/locales/en/properties.json');
      mortgages: typeof import('../i18n/locales/en/mortgages.json');
      admin: typeof import('../i18n/locales/en/admin.json');
      components: typeof import('../i18n/locales/en/components.json');
      ui: {
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        update: string;
        create: string;
        loading: string;
        success: string;
        error: string;
        yes: string;
        no: string;
        back: string;
        next: string;
        submit: string;
        confirm: string;
        copy: string;
        view: string;
      };
      components: {
        calendar: {
          today: string;
          month: string;
          year: string;
          previous_month: string;
          next_month: string;
          previous_year: string;
          next_year: string;
        };
        property_form: {
          name: string;
          type: string;
          price: string;
          location: string;
          description: string;
          status: string;
        };
      };
      messages: {
        please_login: string;
        loading: string;
        error_fetching_profile: string;
        error_checking_admin: string;
        copied: string;
        saved: string;
        deleted: string;
        error: string;
      };
      settings: {
        title: string;
        appearance: string;
        appearance_description: string;
        theme: string;
        light: string;
        dark: string;
        language: string;
        language_description: string;
      };
    };
  }
} 