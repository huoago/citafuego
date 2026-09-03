import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';

export const ALL_ADMIN_ROLES=['super_admin','trust_safety','support','finance','analyst','growth','content','seo'] as const;
export type AdminRole=(typeof ALL_ADMIN_ROLES)[number];
type AdminClient=Awaited<ReturnType<typeof createClient>>;

export type AdminAccess=
  | {state:'unauthenticated';userId:null;roles:[]}
  | {state:'forbidden';userId:string;roles:string[]}
  | {state:'allowed';userId:string;roles:string[];admin:AdminClient};

export async function getActiveAdminRolesForUser(client:AdminClient,userId:string){
  const {data}=await client.from('admin_user_roles').select('role_id,expires_at').eq('user_id',userId);
  const now=Date.now();
  return (data??[])
    .filter((row)=>!row.expires_at||new Date(row.expires_at).getTime()>now)
    .map((row)=>String(row.role_id))
    .filter((role)=>ALL_ADMIN_ROLES.includes(role as AdminRole));
}

export async function isActiveAdminUser(client:AdminClient,userId:string){
  return (await getActiveAdminRolesForUser(client,userId)).length>0;
}

export async function getAdminAccess(allowedRoles: readonly string[]=ALL_ADMIN_ROLES):Promise<AdminAccess>{
  const userId=await getAuthenticatedUserId();
  if(!userId)return {state:'unauthenticated',userId:null,roles:[]};
  const client=await createClient();
  const roles=await getActiveAdminRolesForUser(client,userId);
  if(!roles.some((role)=>allowedRoles.includes(role)))return {state:'forbidden',userId,roles};
  return {state:'allowed',userId,roles,admin:client};
}

export async function requireAdmin(allowedRoles:readonly string[]){
  const access=await getAdminAccess(allowedRoles);
  return access.state==='allowed'?{userId:access.userId,roles:access.roles,admin:access.admin}:null;
}
