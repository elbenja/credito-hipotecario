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

const handler: Handler = async (event, context) => {
  // Log the incoming request
  console.log('Function invoked with event:', JSON.stringify(event))

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

    // Validate required fields
    if (!body.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email is required' })
      }
    }

    // Insert data into Supabase
    const { data, error } = await supabase
      .from('early_access_signups')
      .insert([
        {
          email: body.email,
          name: body.name || null,
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