import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'npm:stripe@12.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'), {
  apiVersion: '2024-06-20'
});
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
console.log('Create Checkout Session Function booted!');
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    const { price_id, success_url, cancel_url } = await req.json();
    if (!price_id) {
      throw new Error('Price ID is required');
    }
    // Look up stripe_customer_id for this user
    const { data: userSub, error: userSubError } = await supabaseClient
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();
    if (userSubError) {
      console.warn('No user_subscriptions record found or error:', userSubError.message);
    }

    // --- NEW LOGIC: Check for active subscription and update if exists ---
    let activeSubscription: Stripe.Subscription | null = null;
    if (userSub?.stripe_customer_id) {
      // List active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: userSub.stripe_customer_id,
        status: 'active',
        limit: 1,
      });
      if (subscriptions.data.length > 0) {
        activeSubscription = subscriptions.data[0];
      }
    }

    if (activeSubscription) {
      // User has an active subscription: update it with the new price (prorate)
      const subscriptionItemId = activeSubscription.items.data[0].id;
      const updatedSubscription = await stripe.subscriptions.update(activeSubscription.id, {
        items: [{ id: subscriptionItemId, price: price_id }],
        proration_behavior: 'create_prorations',
      });
      console.log(`✅ Subscription updated for user ${user.id}: ${updatedSubscription.id}`);
      return new Response(JSON.stringify({
        message: 'Subscription updated',
        subscription_id: updatedSubscription.id,
        status: updatedSubscription.status,
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    // --- END NEW LOGIC ---

    // Prepare session params
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      success_url: success_url || `${req.headers.get('origin')}/dashboard?success=true`,
      cancel_url: cancel_url || `${req.headers.get('origin')}/account?cancelled=true`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id }
    };
    if (userSub?.stripe_customer_id) {
      sessionParams.customer = userSub.stripe_customer_id;
    } else {
      sessionParams.customer_email = user.email;
    }
    console.log(`Creating checkout session for user ${user.id} with price ${price_id}`);
    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`✅ Checkout session created: ${session.id}`);
    return new Response(JSON.stringify({
      checkout_url: session.url
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
}); 