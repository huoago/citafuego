import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type BlogAudience = { id: string; name: string; verified: boolean };
export type BlogMediaView = { id: string; url: string | null; status: string; position: number; kind:'image'|'video'; mimeType:string };
export type BlogPostView = {
  postId: string;
  authorId: string;
  authorName: string;
  authorVerified: boolean;
  body: string;
  visibility: 'public' | 'friends' | 'selected' | 'private';
  likesEnabled: boolean;
  commentsEnabled: boolean;
  sharingEnabled: boolean;
  watermarkEnabled: boolean;
  downloadProtection: boolean;
  publishedAt: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewerLiked: boolean;
  media: BlogMediaView[];
  selectedViewerIds: string[];
};

export type BlogCommentView = {
  id: string;
  userId: string;
  displayName: string;
  verified: boolean;
  handle:string;
  body: string;
  createdAt: string;
  canDelete: boolean;
  parentCommentId:string|null;
};

export type BlogSettingsView = {
  defaultVisibility: 'public' | 'friends' | 'selected' | 'private';
  likesEnabled: boolean;
  commentsEnabled: boolean;
  sharingEnabled: boolean;
  watermarkEnabled: boolean;
  downloadProtection: boolean;
};

export const defaultBlogSettings: BlogSettingsView = {
  defaultVisibility: 'friends', likesEnabled: true, commentsEnabled: true, sharingEnabled: true, watermarkEnabled: true, downloadProtection: true,
};

type RawMedia = { id?: unknown; path?: unknown; status?: unknown; position?: unknown; kind?:unknown; mimeType?:unknown };
type RawPost = Record<string, unknown>;

async function normalizePost(client: Awaited<ReturnType<typeof createClient>>, row: RawPost): Promise<BlogPostView> {
  const rawMedia = Array.isArray(row.media) ? row.media as RawMedia[] : [];
  const paths = rawMedia.map((item) => String(item.path ?? '')).filter(Boolean);
  const signed = new Map<string, string>();
  if (paths.length) { const { data } = await client.storage.from('blog-media').createSignedUrls(paths, 120); data?.forEach((item) => { if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl); }); }
  const selected = Array.isArray(row.selected_viewer_ids) ? row.selected_viewer_ids.map(String) : [];
  return {
    postId: String(row.post_id), authorId: String(row.author_id), authorName: String(row.author_name ?? ''), authorVerified: Boolean(row.author_verified), body: String(row.body ?? ''),
    visibility: String(row.visibility ?? 'private') as BlogPostView['visibility'], likesEnabled: Boolean(row.likes_enabled), commentsEnabled: Boolean(row.comments_enabled), sharingEnabled: Boolean(row.sharing_enabled), watermarkEnabled: Boolean(row.watermark_enabled), downloadProtection: Boolean(row.download_protection), publishedAt: row.published_at ? String(row.published_at) : null,
    likeCount: Number(row.like_count ?? 0), commentCount: Number(row.comment_count ?? 0), shareCount: Number(row.share_count ?? 0), viewerLiked: Boolean(row.viewer_liked),
    media: rawMedia.map((item) => { const path = String(item.path ?? ''); return { id: String(item.id ?? path), url: signed.get(path) ?? null, status: String(item.status ?? 'pending'), position: Number(item.position ?? 0), kind:String(item.kind??'image') as 'image'|'video', mimeType:String(item.mimeType??'image/webp') }; }).sort((a, b) => a.position - b.position), selectedViewerIds: selected,
  };
}

export async function getBlogFeed(authorId?: string | null, limit = 20) { const client = await createClient(); const { data, error } = await client.rpc('get_blog_feed', { p_author: authorId ?? null, p_offset: 0, p_limit: limit }); if (error) return [] as BlogPostView[]; return Promise.all(((data ?? []) as RawPost[]).map((row) => normalizePost(client, row))); }
export async function getBlogPost(postId: string) { const client = await createClient(); const { data, error } = await client.rpc('get_blog_post', { p_post: postId }); const row = ((data ?? []) as RawPost[])[0]; if (error || !row) return null; return normalizePost(client, row); }
export async function getBlogComments(postId: string) { const client = await createClient(); const { data, error } = await client.rpc('get_blog_comments', { p_post: postId, p_limit: 200 }); if (error) return [] as BlogCommentView[]; return ((data ?? []) as Record<string, unknown>[]).map((row) => ({ id: String(row.comment_id), userId: String(row.user_id), displayName: String(row.display_name ?? ''), verified: Boolean(row.verified), handle:String(row.handle??''), body: String(row.body ?? ''), createdAt: String(row.created_at), canDelete: Boolean(row.can_delete), parentCommentId:row.parent_comment_id?String(row.parent_comment_id):null })); }
export async function getBlogAudienceCandidates() { const client = await createClient(); const { data } = await client.rpc('get_my_matches', { p_limit: 100 }); return ((data ?? []) as Record<string, unknown>[]).map((row) => ({ id: String(row.other_profile_id), name: String(row.display_name ?? ''), verified: Boolean(row.verified) })) satisfies BlogAudience[]; }
export async function getBlogSettings() { const client = await createClient(); const { data } = await client.from('blog_settings').select('default_visibility,likes_enabled,comments_enabled,sharing_enabled,watermark_enabled,download_protection').maybeSingle(); if (!data) return defaultBlogSettings; return { defaultVisibility: String(data.default_visibility) as BlogSettingsView['defaultVisibility'], likesEnabled: Boolean(data.likes_enabled), commentsEnabled: Boolean(data.comments_enabled), sharingEnabled: Boolean(data.sharing_enabled), watermarkEnabled: Boolean(data.watermark_enabled), downloadProtection: Boolean(data.download_protection) } satisfies BlogSettingsView; }
