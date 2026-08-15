import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';

export async function requireAdmin(allowedRoles: string[]) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;
  const client = await createClient();
  const { data } = await client.from('admin_user_roles').select('role_id').eq('user_id', userId);
  const roles = (data ?? []).map((row) => String(row.role_id));
  if (!roles.some((role) => allowedRoles.includes(role))) return null;
  return { userId, roles, admin: client };
}
