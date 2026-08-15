const PRODUCTION_SUPABASE_URL = 'https://stfbybkutnoqoxhqxyou.supabase.co';
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bzwmFw6D6rx0X4D5VWonhA_hkxf9c4d';

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || PRODUCTION_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || PRODUCTION_SUPABASE_PUBLISHABLE_KEY;
}
