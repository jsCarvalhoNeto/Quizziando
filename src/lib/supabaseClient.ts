import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nttbpmnnzrrhijobinui.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dGJwbW5uenJyaGlqb2JpbnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzU3MTAsImV4cCI6MjA5NTkxMTcxMH0.PKXkZlGb0sqLJ1z6a4rWBzlwZFZDZ1AU5zgaYrhs4E8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
