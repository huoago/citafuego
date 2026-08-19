import {z} from 'zod';
import {callAccountEdgePayload} from '@/lib/auth/account-edge';
import {isAllowedAccountUsername} from '@/lib/auth/account-identity';

const schema=z.object({username:z.string().trim().min(4).max(24)});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!isAllowedAccountUsername(parsed.data.username))return Response.json({ok:true});
  await callAccountEdgePayload(request,{action:'request_recovery',username:parsed.data.username});
  // Always return the same response so account existence is not disclosed.
  return Response.json({ok:true});
}
