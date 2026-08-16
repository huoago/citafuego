import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getModerationProvider } from '@/lib/adapters/moderation';

const visibility = z.enum(['public', 'friends', 'selected', 'private']);
const schema = z.object({
  body: z.string().max(4000).default(''),
  visibility,
  selectedViewerIds: z.array(z.string().uuid()).max(100).default([]),
  likesEnabled: z.boolean(), commentsEnabled: z.boolean(), sharingEnabled: z.boolean(),
  watermarkEnabled: z.boolean(), downloadProtection: z.boolean(),
});

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'invalid_payload' }, { status: 400 });
  if (parsed.data.body.trim()) {
    const moderation = await getModerationProvider().moderateText({ text: parsed.data.body, surface: 'blog_post', userId });
    if (moderation.action === 'hold' || moderation.action === 'block') return Response.json({ error: 'content_blocked' }, { status: 422 });
  }
  const client = await createClient();
  const { data, error } = await client.rpc('create_blog_draft', {
    p_body: parsed.data.body,
    p_visibility: parsed.data.visibility,
    p_selected_viewers: parsed.data.selectedViewerIds,
    p_likes_enabled: parsed.data.likesEnabled,
    p_comments_enabled: parsed.data.commentsEnabled,
    p_sharing_enabled: parsed.data.sharingEnabled,
    p_watermark_enabled: parsed.data.watermarkEnabled,
    p_download_protection: parsed.data.downloadProtection,
  });
  if (error) return Response.json({ error: error.message.includes('rate_limited') ? 'rate_limited' : 'post_create_failed' }, { status: 409 });
  return Response.json({ postId: data }, { status: 201 });
}
