import { getBlogAudienceCandidates,getBlogSettings } from '@/lib/blog/server';
import { BlogComposer } from '@/components/blog/blog-composer';
export const dynamic='force-dynamic';
export default async function Page(){const[audience,settings]=await Promise.all([getBlogAudienceCandidates(),getBlogSettings()]);return <section><div className="pageHeader"><p className="eyebrow">Comparte sin perder el control</p><h1>Nueva publicación</h1><p className="muted">La privacidad se aplica en el servidor. La marca de agua se integra en cada imagen antes de guardarla.</p></div><BlogComposer audience={audience} initialSettings={settings}/></section>}
