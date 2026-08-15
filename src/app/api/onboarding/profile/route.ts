import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';

const intent=z.enum(['serious','meet_people','casual','friendship','open_to_see']);
const schema=z.object({
  displayName:z.string().trim().min(1).max(40),bio:z.string().trim().min(20).max(500),genderIdentity:z.string().trim().min(1).max(40),city:z.literal('Lima'),district:z.string().trim().min(1).max(80),intent,
  interestedIn:z.array(z.string().min(1).max(40)).min(1).max(10),minAge:z.number().int().min(18).max(99),maxAge:z.number().int().min(18).max(99),maxDistanceKm:z.number().int().min(1).max(250),intentions:z.array(intent).max(5),interestIds:z.array(z.number().int().positive()).min(3).max(8),
  location:z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),accuracyM:z.number().nonnegative().nullable()}).nullable().optional(),
});
export async function POST(request:Request){
  const userId=await getAuthenticatedUserId(); if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const parsed=schema.safeParse(await request.json()); if(!parsed.success||parsed.data.maxAge<parsed.data.minAge)return Response.json({error:'invalid_payload'},{status:400});
  const supabase=await createClient(); const d=parsed.data;
  const {data,error}=await supabase.rpc('save_onboarding_profile',{p_display_name:d.displayName,p_bio:d.bio,p_gender_identity:d.genderIdentity,p_city:d.city,p_district:d.district,p_intent:d.intent,p_interested_in:d.interestedIn,p_min_age:d.minAge,p_max_age:d.maxAge,p_max_distance_km:d.maxDistanceKm,p_intentions:d.intentions,p_interest_ids:d.interestIds,p_latitude:d.location?.latitude??null,p_longitude:d.location?.longitude??null,p_accuracy_m:d.location?.accuracyM??null});
  if(error)return Response.json({error:'onboarding_save_failed',...(process.env.NODE_ENV==='development'?{detail:error.message}:{})},{status:400}); return Response.json(data);
}
