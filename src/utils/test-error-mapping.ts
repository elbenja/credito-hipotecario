import { mapSupabaseErrorToTranslationKey } from "./supabase-error-mapper";

// Test the error mapping function
function testErrorMapping() {
  const testCases = [
    {
      error: { message: "User already registered" },
      expected: "auth.errors.user_already_registered"
    },
    {
      error: { message: "Invalid login credentials" },
      expected: "auth.errors.invalid_credentials"
    },
    {
      error: { message: "Email not confirmed" },
      expected: "auth.errors.email_not_confirmed"
    },
    {
      error: { message: "Too many requests" },
      expected: "auth.errors.too_many_requests"
    },
    {
      error: { message: "Some unknown error" },
      expected: "auth.errors.generic_error"
    },
    {
      error: null,
      expected: "auth.errors.generic_error"
    }
  ];

  console.log("Testing Supabase error mapping...");
  
  testCases.forEach((testCase, index) => {
    const result = mapSupabaseErrorToTranslationKey(testCase.error);
    const passed = result === testCase.expected;
    console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Input: ${testCase.error?.message || 'null'}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got: ${result}`);
    console.log('');
  });
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testErrorMapping = testErrorMapping;
}

export { testErrorMapping }; 