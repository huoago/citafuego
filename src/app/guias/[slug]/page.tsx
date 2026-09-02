import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SEO_GUIDES, findGuide } from '@/lib/seo-content';
import { absoluteUrl, publicMetadata } from '@/lib/seo';

export function generateStaticParams(){return SEO_GUIDES.map(({slug})=>({slug}));}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const guide=findGuide(slug);
  if(!guide)return {};
  return publicMetadata({title:guide.title,description:guide.description,path:`/guias/${guide.slug}`});
}

export default async function GuidePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const guide=findGuide(slug);
  if(!guide)notFound();
  const breadcrumb={
    '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'CitaFuego',item:absoluteUrl('/')},
      {'@type':'ListItem',position:2,name:'Guías',item:absoluteUrl('/guias')},
      {'@type':'ListItem',position:3,name:guide.title,item:absoluteUrl(`/guias/${guide.slug}`)},
    ],
  };
  const article={
    '@context':'https://schema.org','@type':'Article',headline:guide.title,description:guide.description,
    mainEntityOfPage:absoluteUrl(`/guias/${guide.slug}`),publisher:{'@type':'Organization',name:'CitaFuego',url:absoluteUrl('/')},inLanguage:'es-PE',
  };
  return <main className="legalPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(article)}} />
    <p className="eyebrow">Guía CitaFuego</p>
    <h1>{guide.title}</h1>
    <p>{guide.description}</p>
    {guide.sections.map((section)=><section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
    <h2>Regla básica</h2>
    <p>Las citas deben ser entre adultos, con consentimiento, respeto y sin intercambio económico por encuentros. Si algo no encaja, no continúes la interacción y utiliza bloqueo o reporte.</p>
    <p><Link href="/guias">Más guías</Link> · <Link href="/safety">Centro de seguridad</Link> · <Link href="/registro">Crear una cuenta</Link></p>
  </main>;
}
