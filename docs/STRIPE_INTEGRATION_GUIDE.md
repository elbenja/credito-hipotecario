# Stripe Subscription Integration Guide

## Overview
This guide explains how the Stripe subscription system is integrated with your Supabase application.

## Architecture

### 1. Database Structure
- **subscription_plans**: Contains your subscription plans with Stripe `price_id`
- **user_subscriptions**: Tracks user subscriptions linked to Stripe
- **plan_features**: Defines limits for each plan (properties, mortgages, rentals)

### 2. Edge Functions

#### `create-checkout-session`
- **Purpose**: Creates Stripe checkout sessions for subscription upgrades
- **URL**: `https://ojhbihizejrsbintroie.supabase.co/functions/v1/create-checkout-session`
- **Authentication**: Requires user JWT token
- **Input**: `{ price_id, success_url?, cancel_url? }`
- **Output**: `{ checkout_url }`

#### `Stripe-Template` (Webhook Handler)
- **Purpose**: Handles Stripe webhook events
- **URL**: `https://ojhbihizejrsbintroie.supabase.co/functions/v1/Stripe-Template`
- **Events Handled**:
  - `checkout.session.completed`: Creates/updates user subscription
  - `customer.subscription.updated`: Updates subscription status
  - `customer.subscription.deleted`: Marks subscription as cancelled

### 3. Frontend Integration

#### Service Layer (`src/services/stripeService.ts`)
```typescript
// Create a checkout session
const { checkout_url } = await createCheckoutSession(priceId);
// Redirect user to Stripe
redirectToCheckout(checkout_url);
```

#### Account Page (`src/pages/account/Account.tsx`)
- Displays subscription plans with upgrade buttons
- Handles checkout flow initiation
- Shows loading states during checkout creation

#### Dashboard Page (`src/pages/Dashboard.tsx`)
- Handles return from Stripe checkout
- Shows success/cancellation messages
- Clears URL parameters after processing

## Stripe Configuration

### Required Environment Variables (Set in Supabase)
```
STRIPE_API_KEY=sk_test_... (or sk_live_...)
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
```

### Stripe Dashboard Setup
1. **Products & Prices**: Create subscription products with recurring prices
2. **Webhooks**: Configure webhook endpoint to point to your Edge Function
3. **Webhook Events**: Enable these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## Database Setup

### Update Subscription Plans with Stripe Price IDs
```sql
-- Example: Update your plans with real Stripe price IDs
UPDATE subscription_plans 
SET price_id = 'price_1RRJsDQci5n52iCWLqUsxU5U' 
WHERE name = 'Personal';

UPDATE subscription_plans 
SET price_id = 'price_YOUR_PROFESSIONAL_PRICE_ID' 
WHERE name = 'Profesional';

UPDATE subscription_plans 
SET price_id = 'price_YOUR_INVERSIONISTA_PRICE_ID' 
WHERE name = 'Inversionista';
```

## User Flow

1. **User clicks "Upgrade"** → Frontend calls `createCheckoutSession()`
2. **Edge Function creates Stripe session** → Returns checkout URL
3. **User redirected to Stripe** → Completes payment
4. **Stripe sends webhook** → Updates user subscription in database
5. **User returns to app** → Sees success message and updated plan

## Testing

### Test with Stripe Test Mode
1. Use test price IDs in your subscription_plans table
2. Use test webhook signing secret
3. Use Stripe test card numbers (4242 4242 4242 4242)

### Debugging
- Check Edge Function logs: `supabase functions logs create-checkout-session`
- Check webhook logs: `supabase functions logs Stripe-Template`
- Verify webhook delivery in Stripe Dashboard

## Security Features

- ✅ JWT token verification for checkout creation
- ✅ Webhook signature verification
- ✅ User authorization checks
- ✅ CORS headers properly configured
- ✅ No sensitive data exposed to frontend

## Next Steps

1. **Update Stripe Price IDs**: Replace the `faux-price_*` values with real Stripe price IDs
2. **Test the Flow**: Try upgrading a subscription in test mode
3. **Configure Production**: Set up production Stripe keys and webhook URLs
4. **Monitor**: Watch logs and Stripe dashboard for successful payments

## Troubleshooting

### Common Issues
- **Invalid price_id**: Ensure price IDs in database match Stripe
- **Webhook not receiving events**: Check webhook URL and signing secret
- **Checkout creation fails**: Verify user authentication and price_id exists
- **Database not updating**: Check webhook handler logs for errors

### Support
The integration includes comprehensive logging for debugging. Check Supabase Edge Function logs for detailed error information. 