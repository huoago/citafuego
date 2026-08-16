import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function recordProfileView(targetUserId:string){const s=await createClient();await s.rpc('record_recommendation_event',{p_event:'profile_view',p_target_user:targetUserId,p_content_type:'profile',p_content_id:targetUserId,p_dwell_ms:null,p_metadata:{surface:'social_profile'}}).catch(()=>null)}
export async function recordBlogView(postId:string){const s=await createClient();await s.rpc('record_recommendation_event',{p_event:'blog_view',p_target_user:null,p_content_type:'blog',p_content_id:postId,p_dwell_ms:null,p_metadata:{surface:'blog_detail'}}).catch(()=>null)}
