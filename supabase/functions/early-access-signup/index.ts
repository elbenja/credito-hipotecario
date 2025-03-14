import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface SignupData {
  email: string
  language: string
  website?: string // honeypot field
}

function getClientIp(req: Request): { ip: string; source: string } {
  // Define headers to check in priority order
  const headerChecks = [
    { name: 'cf-connecting-ip', label: 'Cloudflare' },
    { name: 'x-forwarded-for', label: 'Forward Chain' },
    { name: 'x-real-ip', label: 'Nginx' },
    { name: 'x-client-ip', label: 'CDN' },
    { name: 'true-client-ip', label: 'Akamai' },
    { name: 'x-forwarded', label: 'Proxy' },
    { name: 'forwarded-for', label: 'Proxy Alt' },
    { name: 'remote-addr', label: 'Direct' }
  ];

  // Log all headers for debugging
  const allHeaders = Object.fromEntries(req.headers.entries());
  console.log('All request headers:', JSON.stringify(allHeaders, null, 2));

  // Check each header in order
  for (const { name, label } of headerChecks) {
    const value = req.headers.get(name);
    if (value) {
      console.log(`Found IP in ${name} header:`, value);
      
      // Handle comma-separated lists (like in x-forwarded-for)
      const ips = value.split(',').map(ip => ip.trim());
      if (ips[0]) {
        return { 
          ip: ips[0],
          source: `${label} (${name})`
        };
      }
    }
  }

  return {
    ip: 'unknown',
    source: 'No headers found'
  };
}

serve(async (req) => {
  try {
    // Log request method and URL
    console.log(`Request ${req.method} from ${new URL(req.url).pathname}`);

    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get and log the IP address information
    const { ip: clientIp, source: ipSource } = getClientIp(req);
    console.log('IP Detection Result:', { ip: clientIp, source: ipSource });

    // Get the request body
    const data: SignupData = await req.json()
    console.log('Request body:', JSON.stringify(data, null, 2));

    // If honeypot field is filled, silently accept
    if (data.website) {
      console.log('Honeypot triggered, silently accepting');
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log environment check
    console.log('Environment check:', {
      hasUrl: !!Deno.env.get('SUPABASE_URL'),
      hasKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    });

    // Insert the signup data
    const signupData = {
      email: data.email,
      language: data.language,
      ip_address: clientIp,
      ip_source: ipSource,
      status: 'unverified',
      headers: JSON.stringify(Object.fromEntries(req.headers.entries()))
    };

    console.log('Inserting signup data:', JSON.stringify(signupData, null, 2));

    const { error } = await supabaseClient
      .from('early_access_signups')
      .insert([signupData])

    if (error) {
      console.error('Database insertion error:', error);
      throw error;
    }

    console.log('Signup successful');
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.constructor.name
      }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}) 