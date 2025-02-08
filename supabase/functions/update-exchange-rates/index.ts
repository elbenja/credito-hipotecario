
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('EXCHANGERATE_API_KEY')
    if (!apiKey) {
      throw new Error('EXCHANGERATE_API_KEY is not set')
    }

    // Fetch the exchange rate from the API
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/PEN`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(`API request failed: ${data.error || 'Unknown error'}`)
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Update exchange rates in the database
    const { error: usdToPenError } = await supabase
      .from('exchange_rates')
      .upsert({
        from_currency: 'USD',
        to_currency: 'PEN',
        rate: data.conversion_rate,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'from_currency,to_currency'
      })

    // Also insert the inverse rate
    const { error: penToUsdError } = await supabase
      .from('exchange_rates')
      .upsert({
        from_currency: 'PEN',
        to_currency: 'USD',
        rate: 1 / data.conversion_rate,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'from_currency,to_currency'
      })

    if (usdToPenError || penToUsdError) {
      throw new Error('Failed to update exchange rates in database')
    }

    console.log('Exchange rates updated successfully')
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error updating exchange rates:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
