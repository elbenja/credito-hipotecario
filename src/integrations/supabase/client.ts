
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  // Provide fallback values during development
  const fallbackUrl = 'https://ojhbihizejrsbintroie.supabase.co';
  const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qaGJpaGl6ZWpyc2JpbnRyb2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzNDg3ODIsImV4cCI6MjA1MzkyNDc4Mn0.Wkc_vd_UXnJXseHy9gbxaUGcLzqel5Cz9AxutvrpDUw';
  
  // Export the Supabase client with fallback values
  export const supabase = createClient<Database>(
    supabaseUrl || fallbackUrl,
    supabaseAnonKey || fallbackKey
  );
} else {
  // Export the Supabase client with environment variables
  export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}
