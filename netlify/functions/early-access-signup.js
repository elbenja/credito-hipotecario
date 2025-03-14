const { createClient } = require('@supabase/supabase-js')

// Log environment variables (temporarily for debugging)
console.log('URL:', process.env.SUPABASE_URL)
console.log('KEY exists:', !!process.env.SUPABASE_ANON_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
)

exports.handler = async (event, context) => {
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
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { email, language, website } = JSON.parse(event.body)

    // Log the received data (temporarily for debugging)
    console.log('Received data:', { email, language, website })

    // Honeypot check
    if (website) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Success' })
      }
    }

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
      console.error('Supabase error:', error)
      throw error
    }

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
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Error registering for early access',
        error: error.message
      })
    }
  }
} 