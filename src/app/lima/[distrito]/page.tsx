import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LIMA_DISTRICTS, findDistrict } from '@/lib/seo-content';
import { absoluteUrl, publicMetadata } from '@/lib/seo';

export function generateStaticParams(){return LIMA_DISTRICTS.map(({slug})=>({distrito:slug}));}

export async function generateMetadata({params}:{params:Promise<{distrito:string}>}):Promise<Metadata>{
  const {distrito}=await params;
  const data=findDistrict(distrito);
  if(!data)return {};
  return publicMetadata({
    title:`Citas en ${data.name}, Lima`,
    description:`Conoce personas adultas en ${data.name}, Lima. Consejos de seguridad, zonas públicas y una forma clara de pasar del chat a una cita real.`,
    path:`/lima/${data.slug}`,
  });
}

export default async function DistrictPage({params}:{params:Promise<{distrito:string}>}){
  const {distrito}=await params;
  const data=findDistrict(distrito);
  if(!data)notFound();
  const breadcrumb={
    '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'CitaFuego',item:absoluteUrl('/')},
      {'@type':'ListItem',position:2,name:'Lima',item:absoluteUrl('/lima')},
      {'@type':'ListItem',position:3,name:data.name,item:absoluteUrl(`/lima/${data.slug}`)},
    ],
  };
  return <main className="legalPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}} />
    <p className="eyebrow">Citas en Lima</p>
    <h1>Citas en {data.name}</h1>
    <p>{data.summary}</p>
    <h2>Zonas conocidas para un primer encuentro</h2>
    <ul>{data.areas.map((area)=><li key={area}>{area}</li>)}</ul>
    <h2>Consejos de seguridad</h2>
    <ul>{data.tips.map((tip)=><li key={tip}>{tip}</li>)}</ul>
    <p>Antes de reunirte, conversa lo suficiente para comprobar que la otra persona es coherente con su perfil. CitaFuego prohíbe menores, suplantación, fraude, acoso y pago por encuentros.</p>
    <p><Link href="/safety">Centro de seguridad</Link> · <Link href="/community-guidelines">Normas de la comunidad</Link> · <Link href="/registro">Crear una cuenta</Link></p>
  </main>;
}
