import { createClient } from '@/lib/supabase/server';
import { ProfilePromptEditor } from '@/components/profile/profile-prompt-editor';
export const dynamic='force-dynamic';
export default async function Page(){const s=await createClient();const{data}=await s.from('profile_prompts').select('slot,prompt_key,answer').order('slot');return <section><div className="pageHeader"><p className="eyebrow">Más que una foto</p><h1>Profile Prompts</h1><p className="muted">Elige hasta tres respuestas que den contexto y creen mejores comienzos de conversación.</p></div><ProfilePromptEditor initial={(data??[]).map(x=>({slot:Number(x.slot),prompt_key:String(x.prompt_key),answer:String(x.answer)}))}/></section>}
