import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizePrivateStorageImage,InvalidUploadedImageError } from '@/lib/media/sanitize-image';
import { getModerationProvider } from '@/lib/adapters/moderation';
const schema=z.object({intentId:z.string().uuid()});
export async function POST(request:Request){
 const userId=await getAuthenticatedUserId();if(!userId)return Response.json({error:'unauthorized'},{status:401});
 const p=schema.safeParse(await request.json());if(!p.success)return Response.json({error:'invalid_payload'},{status:400});
 const s=await createClient();
 const{data:intent}=await s.from('media_upload_intents').select('id,storage_path,mime_type,kind,metadata,expires_at').eq('id',p.data.intentId).eq('user_id',userId).eq('bucket','blog-media').eq('status','created').maybeSingle();
 if(!intent||!['blog_image','blog_video'].includes(String(intent.kind))||new Date(String(intent.expires_at)).getTime()<=Date.now())return Response.json({error:'intent_invalid'},{status:410});
 const postId=String((intent.metadata as Record<string,unknown>)?.post_id??'');
 const[{data:post},{data:profile}]=await Promise.all([s.from('blog_posts').select('id,watermark_enabled').eq('id',postId).eq('author_id',userId).eq('status','draft').maybeSingle(),s.from('profiles').select('display_name').eq('id',userId).maybeSingle()]);
 if(!post||!profile)return Response.json({error:'post_unavailable'},{status:409});
 if(intent.kind==='blog_video'){
  const finalPath=String(intent.storage_path);const{data:videoBlob}=await s.storage.from('blog-media').download(finalPath);const moderation=await getModerationProvider().moderateVideo({surface:'blog_video',userId,mimeType:String(intent.mime_type),bytes:videoBlob?await videoBlob.arrayBuffer():undefined});const status=moderation.action==='block'?'rejected':moderation.action==='hold'?'pending':'approved';
  const{data:mediaId,error}=await s.rpc('finalize_blog_video_upload',{p_intent:intent.id,p_final_path:finalPath,p_status:status});
  if(error){await s.storage.from('blog-media').remove([finalPath]);return Response.json({error:'media_finalize_failed'},{status:500});}
  if(status==='rejected')await s.storage.from('blog-media').remove([finalPath]);return Response.json({mediaId,status,reviewRequired:status==='pending',reviewMode:status==='pending'?'human_video':'automated_video',moderationProvider:moderation.provider},{status:201});
 }
 try{
  const sanitized=await sanitizePrivateStorageImage({client:s,bucket:'blog-media',rawPath:String(intent.storage_path),ownerId:userId,prefix:'blog',expectedMimeType:String(intent.mime_type),watermarkText:post.watermark_enabled?String(profile.display_name):null});
  const{data:moderationBlob}=await s.storage.from('blog-media').download(sanitized.storagePath);
  const moderation=await getModerationProvider().moderateImage({surface:'blog_image',userId,mimeType:'image/webp',bytes:moderationBlob?await moderationBlob.arrayBuffer():undefined});
  const status=moderation.action==='block'?'rejected':moderation.action==='hold'?'pending':'approved';
  const{data:mediaId,error}=await s.rpc('finalize_blog_media_upload',{p_intent:intent.id,p_final_path:sanitized.storagePath,p_status:status,p_width:sanitized.width,p_height:sanitized.height});
  if(error){await s.storage.from('blog-media').remove([sanitized.storagePath]);return Response.json({error:'media_finalize_failed'},{status:500});}
  if(status==='rejected')await s.storage.from('blog-media').remove([sanitized.storagePath]);
  return Response.json({mediaId,status,reviewRequired:status==='pending',moderationProvider:moderation.provider},{status:201});
 }catch(error){if(error instanceof InvalidUploadedImageError)return Response.json({error:error.message},{status:415});return Response.json({error:'media_processing_failed'},{status:500});}
}
