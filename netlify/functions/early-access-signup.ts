import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

function getClientIp(headers: { [key: string]: string | undefined }): { ip: string; source: string } {
  // Log all headers for debugging
  // console.log('Request headers:', headers)

  // Check headers in priority order
  const headerChecks = [
    { name: 'x-nf-client-connection-ip', label: 'Netlify' },
    { name: 'x-forwarded-for', label: 'Forward Chain' },
    { name: 'cf-connecting-ip', label: 'Cloudflare' },
    { name: 'x-real-ip', label: 'Nginx' },
    { name: 'true-client-ip', label: 'Akamai' },
    { name: 'x-client-ip', label: 'CDN' }
  ]

  for (const { name, label } of headerChecks) {
    const value = headers[name]
    if (value) {
      // For x-forwarded-for, take the first IP in the chain
      const ip = name === 'x-forwarded-for' ? value.split(',')[0].trim() : value
      // console.log(`Found IP ${ip} from ${label} header: ${name}`)
      return { ip, source: `${label} (${name})` }
    }
  }

  // console.log('No IP address found in headers')
  return { ip: 'unknown', source: 'none' }
}

const handler: Handler = async (event, context) => {
  // Log the incoming request
  console.log('Function invoked with event:', {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
  })

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    }
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body || '{}')
    console.log('Parsed request body:', body)

    // Check honeypot field
    if (body.website) {
      console.log('Honeypot field filled, likely spam')
      return {
        statusCode: 200, // Return 200 to not alert bots
        body: JSON.stringify({ message: 'Thank you for your submission' })
      }
    }

    // Validate required fields
    if (!body.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email is required' })
      }
    }

    // Get client IP
    const { ip, source } = getClientIp(event.headers)

    // Insert data into Supabase
    const { data, error } = await supabase
      .from('early_access_signups')
      .insert([
        {
          email: body.email,
          language: body.language || 'en',
          ip_address: ip,
          ip_source: source,
          headers: event.headers, // Store headers for debugging
          created_at: new Date().toISOString()
        }
      ])
      .select()

    console.log('Supabase response:', { data, error })

    if (error) {
      console.error('Supabase error:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          message: 'Error saving to database',
          error: error.message 
        })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully signed up for early access',
        data: data[0]
      })
    }

  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

export { handler } 