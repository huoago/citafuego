import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiscoverProfile,ProfilePrompt } from '@/lib/types';

export async function serializeDiscover(client:SupabaseClient,rows:any[]):Promise<DiscoverProfile[]>{
  const ids=rows.map(r=>String(r.profile_id)).filter(Boolean);
  const primaryPaths=rows.map(r=>String(r.primary_photo_path??'')).filter(Boolean);
  const[{data:photoRows},{data:trustRows}]=ids.length?await Promise.all([
    client.rpc('get_visible_profile_photo_paths',{p_profiles:ids}),
    client.rpc('get_public_trust_badges',{p_profiles:ids}),
  ]):[{data:[] as any[]},{data:[] as any[]}];

  const extra=(photoRows??[]) as Array<{profile_id:string;storage_path:string;photo_position:number;is_primary:boolean}>;
  const trust=new Map<string,{verified:boolean;identity:boolean}>();
  for(const row of (trustRows??[]) as Array<{profile_id:string;photo_verified:boolean;identity_verified:boolean}>){
    trust.set(String(row.profile_id),{verified:Boolean(row.photo_verified),identity:Boolean(row.identity_verified)});
  }

  const allPaths=[...new Set([...primaryPaths,...extra.map(r=>String(r.storage_path)).filter(Boolean)])];
  const urls=new Map<string,string>();
  if(allPaths.length){
    const{data}=await client.storage.from('profile-photos').createSignedUrls(allPaths,600);
    data?.forEach(x=>{if(x.path&&x.signedUrl)urls.set(x.path,x.signedUrl)});
  }

  const photosByProfile=new Map<string,string[]>();
  for(const id of ids){
    const paths=extra
      .filter(r=>String(r.profile_id)===id)
      .sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||Number(a.photo_position)-Number(b.photo_position))
      .map(r=>urls.get(String(r.storage_path)))
      .filter((v):v is string=>Boolean(v));
    photosByProfile.set(id,[...new Set(paths)]);
  }

  return rows.map(r=>{
    const id=String(r.profile_id);
    const primary=urls.get(String(r.primary_photo_path));
    const imageUrls=photosByProfile.get(id)??[];
    if(primary&&!imageUrls.includes(primary))imageUrls.unshift(primary);
    const hasPhoto=imageUrls.length>0;
    const imageUrl=imageUrls[0]??'/profile-placeholder.svg';
    const badges=trust.get(id);
    return{
      id,
      name:String(r.display_name),
      age:Number(r.age),
      district:String(r.district??'Lima'),
      distanceBucket:String(r.distance_bucket??'Zona aproximada'),
      bio:String(r.bio??''),
      intent:r.intent,
      verified:badges?.verified??Boolean(r.verified),
      identityVerified:badges?.identity??false,
      hasPhoto,
      interests:Array.isArray(r.interests)?r.interests.map(String):[],
      imageUrl,
      imageUrls:hasPhoto?imageUrls:[],
      chemistryScore:Number(r.chemistry_score??50),
      sharedInterestCount:Number(r.shared_interest_count??0),
      isOnline:Boolean(r.is_online),
      isBoosted:Boolean(r.is_boosted),
      prompts:Array.isArray(r.prompts)?r.prompts as ProfilePrompt[]:[],
      learningReason:String(r.learning_reason??'Compatible con tus preferencias'),
    };
  });
}
