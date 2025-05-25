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
          click_to_edit: string;
          duplicate: string;
          open_menu: string;
          add: string;
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
          test_extra_installments: string;
          step_one: string;
          step_two: string;
          step_three: string;
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
        create_user: string;
        create_new_user: string;
        create_user_description: string;
        email: string;
        role: string;
        user: string;
        admin: string;
        cancel: string;
        creating: string;
        create: string;
        search_by_email: string;
        filter_by_role: string;
        all: string;
        created_at: string;
        last_sign_in: string;
        actions: string;
        loading: string;
        no_users_found: string;
        never: string;
        sending: string;
        send_reset_email: string;
        confirm_delete_user: string;
        delete_user_description: string;
        warning_deleting_admin: string;
        deleting: string;
        delete: string;
      };
      properties: typeof import('../i18n/locales/en/properties.json');
      mortgages: typeof import('../i18n/locales/en/mortgages.json');
      components: typeof import('../i18n/locales/en/components.json');
      account: typeof import('../i18n/locales/en/account.json');
    };
  }
} 