import Link from 'next/link';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getBlogFeed } from '@/lib/blog/server';
import { BlogCard } from '@/components/blog/blog-card';
export const dynamic='force-dynamic';
export default async function Page(){const userId=await getAuthenticatedUserId();if(!userId)return null;const posts=await getBlogFeed(null,30);return <section><div className="pageHeader blogPageHeader"><div><p className="eyebrow">Historias con privacidad real</p><h1>Blog</h1><p className="muted">Comparte momentos con todos, tus Matches, personas elegidas o solo contigo.</p></div><div className="blogHeaderActions"><Link className="primaryButton" href="/blog/nuevo">＋ Publicar</Link><Link className="ghostButton" href="/blog/mio">Mi blog</Link></div></div>{posts.length?<div className="blogFeed">{posts.map(post=><BlogCard key={post.postId} post={post} currentUserId={userId}/>)}</div>:<div className="emptyState"><h2>Aún no hay publicaciones visibles</h2><p>Publica la primera historia o vuelve cuando tus conexiones compartan algo nuevo.</p><Link href="/blog/nuevo" className="primaryButton">Crear publicación</Link></div>}</section>}
