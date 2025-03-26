import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// This function will be invoked when the Edge Function is called
// It will create a new user with the provided email and password
serve(async (req) => {
  // Set CORS headers to allow requests from any origin
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse request body
    const { email, password, role = 'user' } = await req.json()

    // Validate input
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers }
      )
    }

    // Generate a random password if none provided
    const userPassword = password || Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);

    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      // Supabase API URL - env var exported by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase SERVICE ROLE KEY - env var exported by default when deployed
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create the user with the Admin API
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true, // Automatically confirm the email
      user_metadata: {
        role: role
      },
      // Don't send emails automatically - we'll send password reset instead
      email_settings: {
        disable_signup_emails: true
      }
    })

    if (createError) {
      throw createError
    }

    // If this is an admin user, update their profile accordingly
    if (role === 'admin' && user?.user) {
      try {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            is_admin: true,
            email: email 
          })
          .eq('id', user.user.id)

        if (profileError) {
          console.error('Error updating profile:', profileError)
        }
      } catch (profileUpdateError) {
        console.error('Exception updating profile:', profileUpdateError)
        // Continue despite error - the user has been created successfully
      }
    } else if (user?.user) {
      // For regular users, just make sure email is set in the profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ email: email })
        .eq('id', user.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        user: user?.user,
        message: 'User created successfully' 
      }),
      { status: 200, headers }
    )
  } catch (error) {
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error 
      }),
      { status: 500, headers }
    )
  }
}) 