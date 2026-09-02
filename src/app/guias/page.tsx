import type { Metadata } from 'next';
import Link from 'next/link';
import { SEO_GUIDES } from '@/lib/seo-content';
import { publicMetadata } from '@/lib/seo';

export const metadata:Metadata=publicMetadata({
  title:'Guías de citas, seguridad y privacidad',
  description:'Guías prácticas para conocer personas, preparar una primera cita, detectar estafas y proteger tu privacidad en Lima.',
  path:'/guias',
});

export default function GuidesPage(){
  return <main className="legalPage">
    <p className="eyebrow">Centro de contenidos</p>
    <h1>Guías de citas y seguridad</h1>
    <p>Contenido práctico para personas adultas que quieren conocer gente en Lima y usar plataformas de citas con mayor seguridad.</p>
    <ul>{SEO_GUIDES.map((guide)=><li key={guide.slug}><Link href={`/guias/${guide.slug}`}>{guide.title}</Link><br/><small>{guide.description}</small></li>)}</ul>
  </main>;
}
