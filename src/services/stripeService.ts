import { supabase } from '@/integrations/supabase/client';
import i18n from '@/i18n';

export interface CheckoutSessionResponse {
  checkout_url?: string;
  message?: string;
  subscription_id?: string;
  status?: string;
}

export async function createCheckoutSession(priceId: string): Promise<CheckoutSessionResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error(i18n.t('account:stripe.no_active_session'));
    }

    console.log('Creating checkout session for price:', priceId);

    const response = await supabase.functions.invoke('create-checkout-session', {
      body: {
        price_id: priceId,
        success_url: `${window.location.origin}/dashboard?success=true`,
        cancel_url: `${window.location.origin}/account?cancelled=true`,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || i18n.t('account:stripe.failed_create_checkout'));
    }

    // Return the full response data (may include checkout_url or message)
    return response.data as CheckoutSessionResponse;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export function redirectToCheckout(checkoutUrl: string) {
  // Use window.location.href for immediate redirect
  window.location.href = checkoutUrl;
}

export async function createCustomerPortalSession(): Promise<{ url: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error(i18n.t('account:stripe.no_active_session'));
    }

    const response = await supabase.functions.invoke('create-customer-portal-session', {
      body: {
        return_url: `${window.location.origin}/account`,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || i18n.t('account:stripe.failed_create_portal'));
    }

    if (!response.data?.url) {
      throw new Error(i18n.t('account:stripe.no_portal_url'));
    }

    return response.data as { url: string };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

export function redirectToCustomerPortal(url: string) {
  window.location.href = url;
} 

