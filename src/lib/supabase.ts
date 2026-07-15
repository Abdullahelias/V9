import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean and validate URL - remove trailing slashes and /rest/v1
const cleanUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, '').replace(/\/rest\/v1$/, '') : '';

// Log configuration status (helpful for debugging)
console.log('Supabase configuration:', {
  urlConfigured: Boolean(cleanUrl),
  keyConfigured: Boolean(supabaseAnonKey),
  url: cleanUrl ? `${cleanUrl.slice(0, 30)}...` : 'not set',
  rawUrl: supabaseUrl || 'not set'
});

// Validate URL format
const isValidUrl = cleanUrl && (
  cleanUrl.startsWith('https://') && 
  cleanUrl.includes('.supabase.co')
);

// Make Supabase optional - only create client if credentials are valid
export const supabase = isValidUrl && supabaseAnonKey 
  ? createClient(cleanUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabase);