import Link from 'next/link';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { getStories } from '@/lib/social/server';
import { StoryCard } from '@/components/stories/story-card';
export const dynamic='force-dynamic';

export default async function Page(){
 const me=await getAuthenticatedUserId();if(!me)return null;const stories=await getStories(null);
 return <section>
  <div className="pageHeader blogPageHeader"><div><p className="eyebrow">Momentos · 24 horas</p><h1>Stories</h1><p className="muted">Comparte algo espontáneo con todos en CitaFuego, tus Matches, personas elegidas o solo contigo.</p></div><Link className="primaryButton" href="/stories/nuevo">＋ Nueva Story</Link></div>
  <div className="iosSegmented" aria-label="Cambiar sección social"><Link href="/para-ti">Para ti</Link><Link href="/blog">Comunidad</Link><Link className="active" href="/stories">Stories</Link></div>
  <div style={{height:14}} aria-hidden="true"/>
  {stories.length?<div className="storyFeed">{stories.map(s=><StoryCard key={s.storyId} story={s} currentUserId={me}/>)}</div>:<div className="emptyState"><p className="eyebrow">24 horas</p><h2>No hay Stories visibles</h2><p>Publica una foto, video o texto. Tú eliges la audiencia y, al expirar, deja de aparecer en el feed activo.</p><Link className="primaryButton" href="/stories/nuevo">Crear Story</Link></div>}
 </section>;
}
