import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';

export async function requireAdmin(allowedRoles: string[]) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const client = await createClient();
  const { data } = await client.from('admin_user_roles').select('role_id,expires_at').eq('user_id', userId);
  const now=Date.now();
  const roles = (data ?? []).filter((row)=>!row.expires_at||new Date(row.expires_at).getTime()>now).map((row) => String(row.role_id));
  if (!roles.some((role) => allowedRoles.includes(role))) return null;
  return { userId, roles, admin: client };
}
