import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';

const intent=z.enum(['serious','meet_people','casual','friendship','open_to_see']);
const schema=z.object({
  displayName:z.string().trim().min(1).max(40),
  bio:z.string().trim().max(500).default(''),
  genderIdentity:z.string().trim().max(80).default(''),
  city:z.literal('Lima'),
  district:z.string().trim().max(80).default(''),
  addressLabel:z.string().trim().max(160).default(''),
  intent,
  interestedIn:z.array(z.string().min(1).max(40)).max(10).default([]),
  minAge:z.number().int().min(18).max(99),
  maxAge:z.number().int().min(18).max(99),
  maxDistanceKm:z.number().int().min(1).max(250),
  intentions:z.array(intent).max(5).default([]),
  interestIds:z.array(z.number().int().positive()).max(8).default([]),
  location:z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),accuracyM:z.number().nonnegative().nullable()}).nullable().optional(),
});
export async function POST(request:Request){
  const userId=await getAuthenticatedUserId();if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||parsed.data.maxAge<parsed.data.minAge)return Response.json({error:'invalid_payload',fields:parsed.success?['ageRange']:parsed.error.issues.map(issue=>issue.path.join('.')).filter(Boolean)},{status:400});
  const supabase=await createClient();const d=parsed.data;
  const{data,error}=await supabase.rpc('save_onboarding_profile_v14',{p_display_name:d.displayName,p_bio:d.bio,p_gender_identity:d.genderIdentity,p_city:d.city,p_district:d.district,p_intent:d.intent,p_interested_in:d.interestedIn,p_min_age:d.minAge,p_max_age:d.maxAge,p_max_distance_km:d.maxDistanceKm,p_intentions:d.intentions,p_interest_ids:d.interestIds,p_latitude:d.location?.latitude??null,p_longitude:d.location?.longitude??null,p_accuracy_m:d.location?.accuracyM??null,p_address_label:d.addressLabel});
  if(error){
    const known=['adult_only','invalid_display_name','invalid_bio','invalid_gender','invalid_district','invalid_address','invalid_preferences','invalid_age_range','invalid_distance','interest_count_invalid','invalid_interest','invalid_coordinates'];
    const code=known.find(value=>error.message.includes(value))??'onboarding_save_failed';
    return Response.json({error:code},{status:code==='adult_only'?422:400});
  }
  return Response.json(data);
}
