const { createClient } = require('@supabase/supabase-js')

// Log environment variables (temporarily for debugging)
console.log('Environment check:')
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL)
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY)
console.log('VITE_SUPABASE_URL exists:', !!process.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY exists:', !!process.env.VITE_SUPABASE_ANON_KEY)

// Get the URL and key that will be used
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

console.log('Using URL:', supabaseUrl ? 'URL is set' : 'URL is missing')
console.log('Using Key:', supabaseKey ? 'Key is set' : 'Key is missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables')
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
)

exports.handler = async (event, context) => {
  console.log('Function invoked with method:', event.httpMethod)
  
  // Enable CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    }
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Method Not Allowed' })
    }
  }

  try {
    console.log('Parsing request body:', event.body)
    const { email, language, website } = JSON.parse(event.body)

    // Log the received data
    console.log('Received data:', { email, language, website })

    // Honeypot check
    if (website) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Success' })
      }
    }

    console.log('Attempting Supabase insert...')
    // Insert into Supabase
    const { data, error } = await supabase
      .from('early_access')
      .insert([
        {
          email,
          language,
          status: 'pending',
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    console.log('Insert successful:', data)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Successfully registered for early access',
        data
      })
    }
  } catch (error) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    })
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Error registering for early access',
        error: error.message,
        details: error.details || 'No additional details available'
      })
    }
  }
} 