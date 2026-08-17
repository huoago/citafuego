import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { TrustPreferences } from '@/components/safety/trust-preferences';
export const dynamic='force-dynamic';
export default async function Page(){const userId=await getAuthenticatedUserId();const s=await createClient();const{data}=userId?await s.from('user_trust_preferences').select('verified_only_likes,verified_only_chat,verified_only_random').eq('user_id',userId).maybeSingle():{data:null};const initial={verifiedOnlyLikes:Boolean(data?.verified_only_likes),verifiedOnlyChat:Boolean(data?.verified_only_chat),verifiedOnlyRandom:data?.verified_only_random??true};return <section><div className="pageHeader"><p className="eyebrow">Privacidad y confianza</p><h1>Tú decides quién se acerca</h1><p className="muted">Combina verificación, bloqueo y reglas de contacto para reducir interacciones no deseadas.</p></div><TrustPreferences initial={initial}/><div className="heroActions"><Link className="ghostButton" href="/seguridad">Volver a Seguridad</Link></div></section>}
