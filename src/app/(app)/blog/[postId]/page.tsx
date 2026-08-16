import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getBlogAudienceCandidates,getBlogComments,getBlogPost } from '@/lib/blog/server';
import { BlogCard } from '@/components/blog/blog-card';
import { BlogComments } from '@/components/blog/blog-comments';
import { BlogPrivacyEditor } from '@/components/blog/blog-privacy-editor';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{postId:string}>}){const userId=await getAuthenticatedUserId();if(!userId)return null;const{postId}=await params;if(!z.string().uuid().safeParse(postId).success)notFound();const post=await getBlogPost(postId);if(!post)notFound();const[comments,audience]=await Promise.all([getBlogComments(postId),post.authorId===userId?getBlogAudienceCandidates():Promise.resolve([])]);return <section><div className="blogDetailBack"><Link href="/blog">← Volver al blog</Link></div><BlogCard post={post} currentUserId={userId} detail/>{post.authorId===userId?<BlogPrivacyEditor post={post} audience={audience}/>:null}<BlogComments postId={postId} enabled={post.commentsEnabled} initial={comments}/></section>}
