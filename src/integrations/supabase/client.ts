import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing in .env. Authentication will fail.');
}

// Create a typed supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');
