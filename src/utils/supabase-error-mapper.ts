/**
 * Maps Supabase error messages to translation keys
 * @param error The error object from Supabase
 * @returns The translation key for the error message
 */
export function mapSupabaseErrorToTranslationKey(error: any): string {
  if (!error || !error.message) {
    return "auth.errors.generic_error"
  }

  const errorMessage = error.message.toLowerCase()

  // Map common Supabase error messages to translation keys
  if (errorMessage.includes("user already registered")) {
    return "auth.errors.user_already_registered"
  }
  
  if (errorMessage.includes("invalid login credentials") || 
      errorMessage.includes("invalid email or password")) {
    return "auth.errors.invalid_credentials"
  }
  
  if (errorMessage.includes("email not confirmed") || 
      errorMessage.includes("confirm your email")) {
    return "auth.errors.email_not_confirmed"
  }
  
  if (errorMessage.includes("too many requests") || 
      errorMessage.includes("rate limit")) {
    return "auth.errors.too_many_requests"
  }
  
  if (errorMessage.includes("signup is disabled") || 
      errorMessage.includes("signups not allowed")) {
    return "auth.errors.signup_disabled"
  }
  
  if (errorMessage.includes("password is too weak") || 
      errorMessage.includes("weak password")) {
    return "auth.errors.weak_password"
  }
  
  if (errorMessage.includes("invalid email") || 
      errorMessage.includes("malformed email")) {
    return "auth.errors.email_address_invalid"
  }
  
  if (errorMessage.includes("email rate limit exceeded")) {
    return "auth.errors.email_rate_limit_exceeded"
  }
  
  if (errorMessage.includes("password reset limit exceeded")) {
    return "auth.errors.password_reset_limit_exceeded"
  }
  
  if (errorMessage.includes("token expired") || 
      errorMessage.includes("session expired")) {
    return "auth.errors.token_expired"
  }
  
  if (errorMessage.includes("invalid token") || 
      errorMessage.includes("malformed token")) {
    return "auth.errors.invalid_token"
  }
  
  if (errorMessage.includes("user not found") || 
      errorMessage.includes("no user found")) {
    return "auth.errors.user_not_found"
  }

  // Default to generic error if no specific mapping found
  return "auth.errors.generic_error"
} 