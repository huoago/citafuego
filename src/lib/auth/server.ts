import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === 'string' ? sub : null;
}
