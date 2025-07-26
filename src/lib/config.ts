// Environment configuration
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://fgezlqkecbnuqzgodmlz.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZXpscWtlY2JudXF6Z29kbWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NTYzNTgsImV4cCI6MjA2NzAzMjM1OH0.NTaLSPuhEfysGM_E4u6r9rGytwhDHKuUgY6VxXn5kEQ',
  },
  app: {
    name: 'Tally Check',
    version: '1.0.0',
  },
} as const;

// Type definitions for environment variables
declare global {
  interface ImportMetaEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
} 