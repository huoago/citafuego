import Link from 'next/link';
import {publicMetadata} from '@/lib/seo';

export const metadata=publicMetadata({
  title:'Explorar personas en Lima',
  description:'Descubre cómo CitaFuego organiza conexiones por intención, distrito, cercanía aproximada y señales de confianza antes de entrar al área privada de descubrimiento.',
  path:'/explorar',
});

export default function ExplorarPage(){
  return <main className="marketingPage">
    <section className="marketingHero">
      <p className="eyebrow">Explorar · Lima</p>
      <h1>Encuentra conexiones con contexto, no solo fotografías.</h1>
      <p>CitaFuego combina intención, distrito, cercanía aproximada y señales de confianza. La exploración pública explica el sistema; los perfiles reales y las decisiones de Match permanecen dentro del área privada.</p>
      <div className="marketingActions">
        <Link className="ctaButton" href="/registro">Crear mi perfil</Link>
        <Link className="ghostButton" href="/descubrir">Ya tengo perfil · descubrir</Link>
      </div>
    </section>

    <section className="marketingGrid" aria-label="Cómo funciona la exploración">
      <article className="marketingCard"><b>Intención</b><h2>Filtra por lo que buscas.</h2><p>Citas, amistad y otras formas de conexión se presentan con expectativas más claras desde el inicio.</p></article>
      <article className="marketingCard"><b>Lima</b><h2>Explora por distrito.</h2><p>La navegación local prioriza distritos de Lima y usa cercanía aproximada sin publicar coordenadas exactas.</p></article>
      <article className="marketingCard"><b>Confianza</b><h2>Señales reales, no decorativas.</h2><p>Las marcas de foto, verificación y actividad solo aparecen cuando corresponden a datos reales del perfil.</p></article>
      <article className="marketingCard"><b>Privacidad</b><h2>Los perfiles reales requieren acceso.</h2><p>La página pública orienta y permite indexación; el descubrimiento de usuarios reales continúa detrás del inicio de sesión.</p></article>
    </section>
  </main>;
}
