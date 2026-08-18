import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';

export async function GET(){
  const readiness=await getAuthProviderReadiness();
  return Response.json(readiness,{headers:{'cache-control':'no-store'}});
}
