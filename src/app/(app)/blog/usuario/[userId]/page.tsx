import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getBlogFeed } from '@/lib/blog/server';
import { BlogCard } from '@/components/blog/blog-card';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{userId:string}>}){const currentUserId=await getAuthenticatedUserId();if(!currentUserId)return null;const{userId}=await params;if(!z.string().uuid().safeParse(userId).success)notFound();const posts=await getBlogFeed(userId,50);if(!posts.length)return <section><div className="emptyState"><h1>Sin publicaciones visibles</h1><p>No hay publicaciones que tu cuenta pueda ver en este blog.</p></div></section>;return <section><div className="pageHeader"><p className="eyebrow">Blog personal</p><h1>{posts[0].authorName} {posts[0].authorVerified?'✓':''}</h1></div><div className="blogFeed">{posts.map(post=><BlogCard key={post.postId} post={post} currentUserId={currentUserId}/>)}</div></section>}
