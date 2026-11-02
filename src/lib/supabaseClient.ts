import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.portalinfobva.tech';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc5MzYyOTAyMCwiZXhwIjo0OTQ5MzAyNjIwLCJyb2xlIjoiYW5vbiJ9.iy59pCBnXWvIXbVVEkmWcASrMRGI1AXQHdYzQfnDOM0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
