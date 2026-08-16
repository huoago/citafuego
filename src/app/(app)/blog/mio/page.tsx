import Link from 'next/link';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getBlogFeed } from '@/lib/blog/server';
import { BlogCard } from '@/components/blog/blog-card';
export const dynamic='force-dynamic';
export default async function Page(){const userId=await getAuthenticatedUserId();if(!userId)return null;const posts=await getBlogFeed(userId,50);return <section><div className="pageHeader blogPageHeader"><div><p className="eyebrow">Tu espacio personal</p><h1>Mi blog</h1><p className="muted">Tú decides quién ve cada publicación.</p></div><div className="blogHeaderActions"><Link className="primaryButton" href="/blog/nuevo">＋ Nueva publicación</Link><Link className="ghostButton" href="/blog/configuracion">Privacidad</Link></div></div>{posts.length?<div className="blogFeed">{posts.map(post=><BlogCard key={post.postId} post={post} currentUserId={userId}/>)}</div>:<div className="emptyState"><h2>Tu blog está vacío</h2><p>Comparte una historia, una foto o una idea y elige exactamente quién puede verla.</p><Link href="/blog/nuevo" className="primaryButton">Publicar ahora</Link></div>}</section>}
