import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
const allowed=['profile_impression','profile_like','profile_pass','profile_superfuego','random_join','random_matched','random_ended','prompt_saved','photo_primary','photo_reordered','boost_started'] as const;
const schema=z.object({eventName:z.enum(allowed),sessionId:z.string().max(100).optional(),properties:z.record(z.string(),z.union([z.string().max(300),z.number(),z.boolean(),z.null()])).default({})});
export async function POST(request:Request){const userId=await getAuthenticatedUserId();if(!userId)return Response.json({error:'unauthorized'},{status:401});const parsed=schema.safeParse(await request.json());if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});const s=await createClient();const{error}=await s.from('analytics_events').insert({user_id:userId,event_name:parsed.data.eventName,session_id:parsed.data.sessionId??null,properties:parsed.data.properties});if(error)return Response.json({error:'analytics_write_failed'},{status:400});return Response.json({ok:true},{status:201});}
