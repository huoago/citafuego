import Link from 'next/link';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getBlogFeed } from '@/lib/blog/server';
import { BlogCard } from '@/components/blog/blog-card';
export const dynamic='force-dynamic';

export default async function Page(){
 const userId=await getAuthenticatedUserId();if(!userId)return null;const posts=await getBlogFeed(null,30);
 return <section>
  <div className="pageHeader blogPageHeader"><div><p className="eyebrow">Ideas · momentos · conversación</p><h1>Comunidad</h1><p className="muted">Publicaciones con respuestas, guardados y audiencias bajo tu control. El contenido social vive aquí; tus chats privados siguen separados.</p></div><div className="blogHeaderActions"><Link className="primaryButton" href="/blog/nuevo">＋ Publicar</Link><Link className="ghostButton" href="/blog/mio">Mi blog</Link></div></div>
  <div className="iosSegmented" aria-label="Cambiar sección social"><Link href="/para-ti">Para ti</Link><Link className="active" href="/blog">Comunidad</Link><Link href="/stories">Stories</Link></div>
  <div style={{height:14}} aria-hidden="true"/>
  {posts.length?<div className="blogFeed">{posts.map(post=><BlogCard key={post.postId} post={post} currentUserId={userId}/>)}</div>:<div className="emptyState"><p className="eyebrow">Sé la primera voz</p><h2>Aún no hay publicaciones visibles</h2><p>Comparte una idea, una foto o un momento. Elige si lo ven todos, tus Matches, personas concretas o solo tú.</p><Link href="/blog/nuevo" className="primaryButton">Crear publicación</Link></div>}
 </section>;
}
