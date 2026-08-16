import { getBlogAudienceCandidates } from '@/lib/blog/server';import { StoryComposer } from '@/components/stories/story-composer';
export const dynamic='force-dynamic';
export default async function Page(){const audience=await getBlogAudienceCandidates();return <section><div className="pageHeader"><p className="eyebrow">Visible durante 24 horas</p><h1>Nueva Story</h1><p className="muted">Texto, foto o video. La audiencia se verifica cada vez que alguien intenta verla.</p></div><StoryComposer audience={audience}/></section>}
