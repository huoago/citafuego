export function getSupabaseUrl():string{const value=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!value)throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing.');return value}
export function getSupabasePublishableKey():string{const value=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!value)throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.');return value}
