import { getBlogSettings } from '@/lib/blog/server'; import { BlogSettingsForm } from '@/components/blog/blog-settings-form';
export const dynamic='force-dynamic';
export default async function Page(){const settings=await getBlogSettings();return <section><div className="pageHeader"><p className="eyebrow">Tus reglas por defecto</p><h1>Privacidad del blog</h1><p className="muted">Estas opciones se aplican a nuevas publicaciones y puedes cambiarlas antes de publicar.</p></div><BlogSettingsForm initial={settings}/></section>}
