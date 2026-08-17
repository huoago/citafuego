import Link from 'next/link';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getBlogFeed } from '@/lib/blog/server';
import { getRecommendationHub } from '@/lib/recommendations/server';
import { BlogCard } from '@/components/blog/blog-card';

export const dynamic='force-dynamic';

export default async function Page(){
  const userId=await getAuthenticatedUserId();
  if(!userId)return null;
  const[posts,hub]=await Promise.all([getBlogFeed(null,30),getRecommendationHub()]);
  const topics=hub.topics.slice(0,8);

  return <section className="communityPage">
    <div className="iosLargeHeader">
      <div><p className="eyebrow">Tu red · tus intereses</p><h1>Comunidad</h1><p className="muted">Historias, conversaciones e intereses compartidos para conocer a alguien por algo más que una foto.</p></div>
      <Link className="iosCreateButton" href="/blog/nuevo" aria-label="Crear publicación">＋</Link>
    </div>

    <div className="communityCreateRail" aria-label="Crear e interactuar">
      <Link href="/stories" className="communityCreateCard"><span>◉</span><strong>Stories</strong><small>Momentos de 24 h</small></Link>
      <Link href="/stories/nuevo" className="communityCreateCard"><span>＋</span><strong>Nueva Story</strong><small>Foto o momento</small></Link>
      <Link href="/blog/nuevo" className="communityCreateCard"><span>▤</span><strong>Publicar</strong><small>Idea o conversación</small></Link>
      <Link href="/para-ti" className="communityCreateCard"><span>✦</span><strong>Para ti</strong><small>Tu red recomendada</small></Link>
    </div>

    <div className="iosSegmented communitySegments" aria-label="Secciones de comunidad">
      <Link className="active" href="/comunidad">Comunidad</Link>
      <Link href="/para-ti">Para ti</Link>
      <Link href="/stories">Stories</Link>
    </div>

    {topics.length?<section className="interestShelf" aria-labelledby="interest-title">
      <div className="sectionTitle"><div><p className="eyebrow">Afinidad primero</p><h2 id="interest-title">Intereses que conectan</h2></div></div>
      <div className="interestScroll">{topics.map(topic=><span className="interestPill" key={topic.topicId}># {topic.label}</span>)}</div>
    </section>:null}

    <section id="feed" className="communityFeedSection">
      <div className="sectionTitle"><div><p className="eyebrow">Conversación real</p><h2>Últimas publicaciones</h2></div><Link href="/blog/mio">Mis publicaciones</Link></div>
      {posts.length?<div className="blogFeed">{posts.map(post=><BlogCard key={post.postId} post={post} currentUserId={userId}/>)}</div>:<div className="emptyState"><p className="eyebrow">Sé la primera voz</p><h2>Aún no hay publicaciones visibles</h2><p>Comparte una idea, una foto o un momento. Tú eliges quién puede verlo y responder.</p><Link href="/blog/nuevo" className="primaryButton">Crear publicación</Link></div>}
    </section>
  </section>;
}
