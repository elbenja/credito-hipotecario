import { supabase } from "@/integrations/supabase/client"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    // Verify the token and update the signup status
    const { data: signup, error: verifyError } = await supabase
      .from("early_access_signups")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", token)
      .select()
      .single()

    if (verifyError) {
      return new Response(JSON.stringify({ error: "Invalid verification token" }), {
        status: 400,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    })
  } catch (error) {
    console.error("Error verifying email:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    })
  }
} 