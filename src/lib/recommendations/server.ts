import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getBlogPost, type BlogPostView } from '@/lib/blog/server';
import { getSocialProfile, getStories, type SocialProfileBundle, type StoryView } from '@/lib/social/server';

export type RecommendationFeedItem = {
  type: 'blog' | 'story' | 'profile';
  id: string;
  creatorId: string;
  score: number;
  reason: string;
  blog: BlogPostView | null;
  story: StoryView | null;
  profile: SocialProfileBundle | null;
};

export type FollowRecommendation = {
  profileId: string;
  displayName: string;
  district: string | null;
  verified: boolean;
  photoUrl: string | null;
  score: number;
  reason: string;
};

export type MatchRecommendation = FollowRecommendation & {
  age: number;
  bio: string;
  chemistryScore: number;
  sharedInterestCount: number;
  distanceBucket: string;
};

export type LearnedTopic={topicId:number;slug:string;label:string;weight:number;evidenceCount:number};
const rows = <T extends Record<string, unknown>>(value: unknown) => (Array.isArray(value) ? value as T[] : []);

async function signProfilePhotos(paths: string[]) {
  const client = await createClient();
  const unique = [...new Set(paths.filter(Boolean))];
  const signed = new Map<string, string>();
  if (!unique.length) return signed;
  const { data } = await client.storage.from('profile-photos').createSignedUrls(unique, 300);
  data?.forEach((item) => { if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl); });
  return signed;
}

export async function getRecommendationHub() {
  const client = await createClient();
  const [feedResult, followResult, matchResult,topicResult,variantResult] = await Promise.all([
    client.rpc('get_for_you_feed', { p_limit: 24 }),
    client.rpc('get_recommended_follows', { p_limit: 10 }),
    client.rpc('get_recommended_matches', { p_limit: 10 }),
    client.rpc('get_my_learned_topics',{p_limit:8}),
    client.rpc('get_recommendation_variant',{p_experiment:'rec_blend_v3'}),
  ]);

  const feedRows = rows<Record<string, unknown>>(feedResult.data);
  const followRows = rows<Record<string, unknown>>(followResult.data);
  const matchRows = rows<Record<string, unknown>>(matchResult.data);
  const topicRows = rows<Record<string, unknown>>(topicResult.data);

  const blogIds = [...new Set(feedRows.filter((item) => item.item_type === 'blog').map((item) => String(item.item_id)))];
  const profileIds = [...new Set(feedRows.filter((item) => item.item_type === 'profile').map((item) => String(item.item_id)))];
  const storyCreators = [...new Set(feedRows.filter((item) => item.item_type === 'story').map((item) => String(item.creator_id)))];

  const [blogs, profiles, storyGroups] = await Promise.all([
    Promise.all(blogIds.map(async (id) => [id, await getBlogPost(id)] as const)),
    Promise.all(profileIds.map(async (id) => [id, await getSocialProfile(id)] as const)),
    Promise.all(storyCreators.map(async (id) => [id, await getStories(id)] as const)),
  ]);

  const blogMap = new Map(blogs);
  const profileMap = new Map(profiles);
  const storyMap = new Map<string, StoryView>();
  storyGroups.forEach(([, stories]) => stories.forEach((story) => storyMap.set(story.storyId, story)));

  const feed: RecommendationFeedItem[] = feedRows.map((item) => {
    const type = String(item.item_type) as RecommendationFeedItem['type'];
    const id = String(item.item_id);
    return {
      type,
      id,
      creatorId: String(item.creator_id),
      score: Number(item.recommendation_score ?? 0),
      reason: String(item.reason ?? 'Para ti'),
      blog: type === 'blog' ? blogMap.get(id) ?? null : null,
      story: type === 'story' ? storyMap.get(id) ?? null : null,
      profile: type === 'profile' ? profileMap.get(id) ?? null : null,
    };
  }).filter((item) => item.blog || item.story || item.profile);

  const photoPaths = [
    ...followRows.map((item) => String(item.primary_photo_path ?? '')),
    ...matchRows.map((item) => String(item.primary_photo_path ?? '')),
  ];
  const signed = await signProfilePhotos(photoPaths);

  const follows: FollowRecommendation[] = followRows.map((item) => ({
    profileId: String(item.profile_id),displayName: String(item.display_name ?? ''),district: item.district ? String(item.district) : null,verified: Boolean(item.verified),photoUrl: item.primary_photo_path ? signed.get(String(item.primary_photo_path)) ?? null : null,score: Number(item.recommendation_score ?? 0),reason: String(item.reason ?? 'Para ti'),
  }));

  const matches: MatchRecommendation[] = matchRows.map((item) => ({
    profileId: String(item.profile_id),displayName: String(item.display_name ?? ''),district: item.district ? String(item.district) : null,verified: Boolean(item.verified),photoUrl: item.primary_photo_path ? signed.get(String(item.primary_photo_path)) ?? null : null,score: Number(item.recommendation_score ?? 0),reason: String(item.reason ?? 'Compatibilidad para citas'),age: Number(item.age ?? 0),bio: String(item.bio ?? ''),chemistryScore: Number(item.chemistry_score ?? 0),sharedInterestCount: Number(item.shared_interest_count ?? 0),distanceBucket: String(item.distance_bucket ?? ''),
  }));

  const topics:LearnedTopic[]=topicRows.map(item=>({topicId:Number(item.topic_id),slug:String(item.slug??''),label:String(item.label_es??''),weight:Number(item.weight??0),evidenceCount:Number(item.evidence_count??0)}));
  return { feed, follows, matches,topics,variant:String(variantResult.data??'control') };
}
