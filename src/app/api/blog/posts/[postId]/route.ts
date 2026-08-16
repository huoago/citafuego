import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  visibility: z.enum(['public', 'friends', 'selected', 'private']),
  selectedViewerIds: z.array(z.string().uuid()).max(100).default([]),
  likesEnabled: z.boolean(), commentsEnabled: z.boolean(), sharingEnabled: z.boolean(), downloadProtection: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const userId = await getAuthenticatedUserId(); if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { postId } = await params; if (!z.string().uuid().safeParse(postId).success) return Response.json({ error: 'invalid_post' }, { status: 400 });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: 'invalid_payload' }, { status: 400 });
  const client = await createClient();
  const { data, error } = await client.rpc('update_blog_post_privacy', {
    p_post: postId, p_visibility: parsed.data.visibility, p_selected_viewers: parsed.data.selectedViewerIds,
    p_likes_enabled: parsed.data.likesEnabled, p_comments_enabled: parsed.data.commentsEnabled,
    p_sharing_enabled: parsed.data.sharingEnabled, p_download_protection: parsed.data.downloadProtection,
  });
  if (error) return Response.json({ error: 'update_failed' }, { status: 409 });
  return Response.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const userId = await getAuthenticatedUserId(); if (!userId) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { postId } = await params; if (!z.string().uuid().safeParse(postId).success) return Response.json({ error: 'invalid_post' }, { status: 400 });
  const client = await createClient(); const { data, error } = await client.rpc('remove_blog_post', { p_post: postId });
  if (error) return Response.json({ error: 'remove_failed' }, { status: 409 });
  return Response.json(data);
}
