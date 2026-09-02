import {getAuthenticatedUserId} from '@/lib/auth/server';

export async function POST(){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  return Response.json({error:'document_identity_verification_disabled',next:'/perfil/verificacion-foto'},{status:410});
}
