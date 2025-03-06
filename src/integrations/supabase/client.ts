
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Define fallback values for development
const fallbackUrl = 'https://ojhbihizejrsbintroie.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qaGJpaGl6ZWpyc2JpbnRyb2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzNDg3ODIsImV4cCI6MjA1MzkyNDc4Mn0.Wkc_vd_UXnJXseHy9gbxaUGcLzqel5Cz9AxutvrpDUw';

// Log warning if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables, using fallback values');
}

// Create the Supabase client using environment variables or fallbacks
export const supabase = createClient<Database>(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey
);
