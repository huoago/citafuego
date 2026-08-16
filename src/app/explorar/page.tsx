import Link from 'next/link';

export default function ExplorarPage() {
  return (
    <main className="marketingPage">
      <header className="landingNav">
        <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
        <div className="landingNavLinks">
          <Link href="/como-funciona">Cómo funciona</Link>
          <Link href="/safety">Seguridad</Link>
          <Link className="ghostButton" href="/registro">Crear perfil</Link>
        </div>
      </header>

      <section className="marketingHero">
        <p className="eyebrow">Explorar</p>
        <h1>Conexiones con contexto, no solo fotografías.</h1>
        <p>CitaFuego combina intereses, intención, distancia aproximada, verificación y compatibilidad para hacer que descubrir personas se sienta más personal y menos repetitivo.</p>
        <div className="marketingActions">
          <Link className="ctaButton" href="/registro">Crear mi perfil</Link>
          <Link className="ghostButton" href="/como-funciona">Ver el recorrido</Link>
        </div>
      </section>

      <section className="marketingGrid">
        <article className="marketingCard"><b>Señal útil</b><h2>Compatibilidad visible.</h2><p>Una señal de química ayuda a ordenar la decisión sin sustituir tu criterio ni convertir a las personas en una puntuación.</p></article>
        <article className="marketingCard"><b>Intención</b><h2>Saber qué busca la otra persona.</h2><p>La experiencia prioriza expectativas claras para reducir conversaciones que empiezan desde objetivos incompatibles.</p></article>
        <article className="marketingCard"><b>Privacidad</b><h2>Cercanía sin coordenadas exactas.</h2><p>La distancia se presenta de forma aproximada para mantener utilidad local sin exponer una ubicación precisa.</p></article>
        <article className="marketingCard"><b>Confianza</b><h2>Verificación y acciones de seguridad.</h2><p>Las señales de verificación, bloqueo y reporte permanecen accesibles durante toda la experiencia.</p></article>
      </section>
    </main>
  );
}
