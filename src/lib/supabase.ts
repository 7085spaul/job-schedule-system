import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://ptuzarufwgdwfzmacnab.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXphcnVmd2dkd2Z6bWFjbmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTcxMzEsImV4cCI6MjA2NDU5MzEzMX0.GJ2a1lBNlZs6vDXEiM9fPHgOFdCwiBrVmTeZZnQqO1w';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };