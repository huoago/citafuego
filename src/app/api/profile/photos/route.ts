import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';

const patchSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('primary'),photoId:z.string().uuid()}),
  z.object({action:z.literal('reorder'),photoIds:z.array(z.string().uuid()).min(1).max(9)}),
]);
const deleteSchema=z.object({photoId:z.string().uuid()});

export async function PATCH(request:Request){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const parsed=patchSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});
  const supabase=await createClient();
  if(parsed.data.action==='primary'){
    const{data,error}=await supabase.rpc('set_primary_profile_photo',{p_photo:parsed.data.photoId});
    if(error)return Response.json({error:'photo_primary_failed'},{status:400});
    await supabase.from('analytics_events').insert({user_id:userId,event_name:'photo_primary',properties:{photoId:parsed.data.photoId}});
    return Response.json(data);
  }
  const{data,error}=await supabase.rpc('reorder_profile_photos',{p_photo_ids:parsed.data.photoIds});
  if(error)return Response.json({error:'photo_reorder_failed'},{status:400});
  await supabase.from('analytics_events').insert({user_id:userId,event_name:'photo_reordered',properties:{count:parsed.data.photoIds.length}});
  return Response.json(data);
}

export async function DELETE(request:Request){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  const parsed=deleteSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});
  const supabase=await createClient();
  const{data,error}=await supabase.rpc('remove_own_profile_photo',{p_photo:parsed.data.photoId});
  if(error||!data)return Response.json({error:'photo_delete_failed',message:'No pudimos eliminar esta foto.'},{status:400});
  const result=data as {storagePath?:string;alreadyRemoved?:boolean};
  let cleanupPending=false;
  if(result.storagePath){
    const{error:storageError}=await supabase.storage.from('profile-photos').remove([result.storagePath]);
    cleanupPending=Boolean(storageError);
  }
  await supabase.from('analytics_events').insert({user_id:userId,event_name:'photo_removed',properties:{photoId:parsed.data.photoId,cleanupPending}});
  return Response.json({ok:true,photoId:parsed.data.photoId,cleanupPending,alreadyRemoved:Boolean(result.alreadyRemoved)});
}
