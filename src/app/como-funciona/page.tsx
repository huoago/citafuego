import Link from 'next/link';

export default function ComoFuncionaPage() {
  return (
    <main className="marketingPage">
      <header className="landingNav">
        <Link href="/" className="brandLockup"><span>🔥</span> CitaFuego</Link>
        <div className="landingNavLinks">
          <Link href="/explorar">Explorar</Link>
          <Link href="/safety">Seguridad</Link>
          <Link className="ghostButton" href="/registro">Crear perfil</Link>
        </div>
      </header>

      <section className="marketingHero">
        <p className="eyebrow">Cómo funciona</p>
        <h1>Una ruta clara desde descubrir hasta conversar.</h1>
        <p>La experiencia está separada por pantallas para que cada decisión tenga contexto: perfil, descubrimiento, match, chat, preferencias, plan y seguridad.</p>
        <div className="marketingActions">
          <Link className="ctaButton" href="/registro">Empezar gratis</Link>
          <Link className="ghostButton" href="/iniciar-sesion">Ya tengo cuenta</Link>
        </div>
      </section>

      <section className="marketingGrid">
        <article className="marketingCard"><b>01 · Perfil</b><h2>Preséntate con intención.</h2><p>Fotos, bio, intereses, preferencias y objetivo de conexión construyen una señal más útil que una foto aislada.</p></article>
        <article className="marketingCard"><b>02 · Descubrir</b><h2>Menos perfiles, mejores decisiones.</h2><p>La pantalla de descubrimiento prioriza compatibilidad, cercanía aproximada, verificación e intereses compartidos.</p></article>
        <article className="marketingCard"><b>03 · Match</b><h2>El interés mutuo abre la conversación.</h2><p>Los matches viven en su propia pantalla y cada conexión lleva directamente a un chat individual.</p></article>
        <article className="marketingCard"><b>04 · Control</b><h2>Privacidad y seguridad siempre visibles.</h2><p>Bloqueos, reportes, verificación y preferencias se gestionan en interfaces específicas, sin esconder controles críticos.</p></article>
      </section>
    </main>
  );
}
