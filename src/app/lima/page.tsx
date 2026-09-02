import type { Metadata } from 'next';
import Link from 'next/link';
import { LIMA_DISTRICTS } from '@/lib/seo-content';
import { publicMetadata } from '@/lib/seo';

export const metadata:Metadata=publicMetadata({
  title:'Citas en Lima — conoce personas cerca de ti',
  description:'Explora distritos de Lima y conoce personas adultas con herramientas de seguridad, privacidad, bloqueo y reporte.',
  path:'/lima',
});

export default function LimaPage(){
  return <main className="legalPage">
    <p className="eyebrow">Lima, Perú</p>
    <h1>Citas en Lima</h1>
    <p>CitaFuego está enfocado inicialmente en Lima. Explora información útil por distrito y usa la plataforma para conocer personas adultas, conversar y organizar encuentros con límites claros y medidas de seguridad.</p>
    <h2>Distritos</h2>
    <ul>{LIMA_DISTRICTS.map((district)=><li key={district.slug}><Link href={`/lima/${district.slug}`}>Citas en {district.name}</Link></li>)}</ul>
    <h2>Antes de conocer a alguien</h2>
    <p>Consulta nuestras <Link href="/community-guidelines">normas de la comunidad</Link>, el <Link href="/safety">centro de seguridad</Link> y las <Link href="/guias/seguridad-en-citas-online">guías de seguridad</Link>.</p>
  </main>;
}
