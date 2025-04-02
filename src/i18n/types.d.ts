import 'i18next'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'global'
    resources: {
      global: {
        ui: {
          save: string
          cancel: string
          delete: string
          edit: string
          update: string
          create: string
          loading: string
          success: string
          error: string
          yes: string
          no: string
          back: string
          next: string
          submit: string
          confirm: string
          coming: string
          log_out: string
          copy: string
          duplicate: string
          open_menu: string
          click_to_edit: string
          sort_ascending: string
          sort_descending: string
          update_property: string
          add_new_property: string
        }
        messages: {
          no_user_found: string
          property_updated: string
          property_added: string
          error_saving: string
        }
        settings: {
          title: string
          appearance: string
          appearance_description: string
          theme: string
          light: string
          dark: string
          language: string
          language_description: string
        }
      }
      dashboard: {
        sections: {
          main: string
          dashboard: string
          properties: string
          mortgages: string
          rentals: string
          courses: string
          ai_chat: string
          account: string
          billing: string
          notifications: string
        }
      }
      admin: {
        user_management: {
          title: string
          description: string
          create_user: string
          create_new_user: string
          create_user_description: string
          email: string
          role: string
          user: string
          admin: string
          created_at: string
          last_sign_in: string
          actions: string
          no_users_found: string
          never: string
          send_reset_email: string
          sending: string
          confirm_delete_user: string
          delete_user_description: string
          warning_deleting_admin: string
          deleting: string
          filter_by_role: string
          search_by_email: string
          all: string
        }
      }
      properties: {
        title: string
        description: string
        form: {
          property_name: string
          property_cost: string
          property_insurance: string
          new_property: string
          description: string
          description_placeholder: string
          price: string
          enter_price: string
          currency: string
          select_currency: string
          property_details: string
          property_description: string
          update_property: string
          add_new_property: string
        }
        insurance: {
          auto: string
          manual: string
          amount: string
        }
        bonus: {
          amount: string;
          amount_currency: string;
          no_bonus: string;
          first_home_buyer: string;
          price_range: string;
          sustainable_property: string;
          qualifies_higher_bonus: string;
          applicable_range: string | { min: string; max: string };
          price_outside_range: string;
          price_outside_range_usd: string | { penAmount: string };
        }
        bonus_amount: never;
        bonus_amount_currency: never;
        bonus_no_bonus: never;
        bonus_first_home_buyer: never;
        bonus_price_range: never;
        bonus_sustainable_property: never;
        bonus_qualifies_higher_bonus: never;
        bonus_applicable_range_text: never;
        bonus_price_outside_range: never;
        bonus_price_outside_range_usd_text: never;
        messages: {
          no_properties: string
          property_duplicated: string
          property_deleted: string
          error_duplicating_property: string
          error_deleting_property: string
          property_updated: string
          property_added: string
          error_saving: string
        }
        validation: {
          property_name_required: string
          price_required: string
        }
      }
      mortgages: {
        amortization: {
          title: string
          description: string
          property_percentage: string
          installment_type: {
            title: string
            regular: string
            double: string
          }
        }
      }
      components: {
        extra_installments_section: {
          form: {
            amount: string
            amount_required: string
            amount_positive: string
            amount_placeholder: string
            frequency: string
            frequency_placeholder: string
            frequency_monthly: string
            frequency_one_time: string
            first_date: string
            start_date_required: string
            add_button: string
          }
        }
        payment_scenarios: {
          new_rate_form: {
            success_title: string
            success_message: string
            error_title: string
            error_message: string
            new_interest_rate: string
            new_term: string
            remaining: string
            years: string
            start_date: string
            add_button: string
            table: {
              number: string
              interest_rate: string
              new_term: string
              start_date: string
              delete_tooltip: string
            }
            no_options: string
          }
        }
      }
    }
  }
} 