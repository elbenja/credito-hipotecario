import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'global';
    resources: {
      global: {
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
          coming: string;
          log_out: string;
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
        update_password_page: {
          loading: string;
          invalid_link: string;
          recovery_link_invalid_or_expired: string;
          back_to_home: string;
          update_your_password: string;
          create_new_password_prompt: string;
          new_password: string;
          confirm_password: string;
          updating: string;
          update_password: string;
          passwords_dont_match: string;
          password_too_short: string;
          password_updated: string;
          error_updating_password: string;
          invalid_or_expired_link: string;
        };
      };
      dashboard: {
        sections: {
          main: string;
          dashboard: string;
          properties: string;
          mortgages: string;
          rentals: string;
          courses: string;
          ai_chat: string;
          account: string;
          billing: string;
          notifications: string;
        };
      };
      admin: {
        title: string;
        user_management: string;
        early_access: string;
        test: string;
        messages: {
          admin_only: string;
          please_login: string;
          error_fetching_profile: string;
          error_checking_admin: string;
        };
      };
      properties: typeof import('../i18n/locales/en/properties.json');
      mortgages: typeof import('../i18n/locales/en/mortgages.json');
      components: typeof import('../i18n/locales/en/components.json');
    };
  }
} 