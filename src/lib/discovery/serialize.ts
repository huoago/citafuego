import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiscoverProfile } from '@/lib/types';
export async function serializeDiscover(client:SupabaseClient, rows:any[]):Promise<DiscoverProfile[]>{
 const paths=rows.map(r=>String(r.primary_photo_path??'')).filter(Boolean); const urls=new Map<string,string>();
 if(paths.length){const{data}=await client.storage.from('profile-photos').createSignedUrls(paths,600); data?.forEach(x=>{if(x.path&&x.signedUrl)urls.set(x.path,x.signedUrl)});}
 return rows.filter(r=>urls.has(String(r.primary_photo_path))).map(r=>({id:String(r.profile_id),name:String(r.display_name),age:Number(r.age),district:String(r.district??'Lima'),distanceBucket:String(r.distance_bucket??'Zona aproximada'),bio:String(r.bio??''),intent:r.intent,verified:Boolean(r.verified),interests:Array.isArray(r.interests)?r.interests.map(String):[],imageUrl:urls.get(String(r.primary_photo_path))!,chemistryScore:Number(r.chemistry_score??50),sharedInterestCount:Number(r.shared_interest_count??0)}));
}
