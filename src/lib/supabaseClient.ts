import { createClient } from '@supabase/supabase-js';

// Configuração de Produção - Coolify / Hostinger
export const SUPABASE_URL = 'https://api-quiz.portalinfobva.tech';
export const SUPABASE_ANON_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc5MzYyOTAyMCwiZXhwIjo0OTQ5MzAyNjIwLCJyb2xlIjoiYW5vbiJ9.iy59pCBnXWvIXbVVEkmWcASrMRGI1AXQHdYzQfnDOM0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
