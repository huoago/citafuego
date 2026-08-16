import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landingNav">
        <Link href="/" className="brandLockup" aria-label="CitaFuego inicio"><span>🔥</span> CitaFuego</Link>
        <nav className="landingNavLinks" aria-label="Navegación pública">
          <Link href="/explorar">Explorar</Link>
          <Link href="/como-funciona">Cómo funciona</Link>
          <Link href="/safety">Seguridad</Link>
          <Link className="ghostButton" href="/iniciar-sesion">Entrar</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <div className="heroPill">Solo adultos · Lima · Perfiles reales</div>
          <h1>Menos ruido.<br /><span>Más química.</span><br />Más citas.</h1>
          <p>Descubre personas con intención clara, perfiles verificados y señales de compatibilidad que te ayudan a decidir rápido sin convertir las citas en un juego infinito.</p>
          <div className="heroActions">
            <Link className="ctaButton" href="/registro">🔥 Crear mi perfil</Link>
            <Link className="textButton" href="/como-funciona">Ver cómo funciona</Link>
          </div>
          <div className="trustRow">
            <span>✓ Verificación real</span>
            <span>◉ Ubicación aproximada</span>
            <span>⚑ Reporte y bloqueo</span>
          </div>
        </div>

        <div className="phonePreview" aria-label="Vista previa de una tarjeta de perfil CitaFuego">
          <div className="phoneGlow" />
          <div className="miniCard">
            <div className="miniPhoto" />
            <div className="miniInfo">
              <div><strong>Lucía, 27</strong> <span className="verifiedBadge">✓</span></div>
              <span>Miraflores · 1–3 km · Conocer y ver qué pasa</span>
              <div className="miniChem">🔥 91% química</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landingFeatureRail" aria-label="Explora CitaFuego">
        <Link className="featureLinkCard" href="/explorar">
          <span>✦</span>
          <h3>Explora por intención</h3>
          <p>Conoce cómo presentamos intereses, intención y señales útiles antes de dar Like.</p>
        </Link>
        <Link className="featureLinkCard" href="/como-funciona">
          <span>♡</span>
          <h3>Del perfil al chat</h3>
          <p>Cada acción importante abre una experiencia clara: descubrir, match, chat, perfil y seguridad.</p>
        </Link>
        <Link className="featureLinkCard" href="/safety">
          <span>✓</span>
          <h3>Control primero</h3>
          <p>Privacidad, verificación, bloqueo y reportes forman parte del producto, no de la letra pequeña.</p>
        </Link>
      </section>

      <footer className="landingFooter">
        <div className="brandLockup"><span>🔥</span> CitaFuego <small>Adultos</small></div>
        <div className="footerLinks">
          <Link href="/terminos">Términos</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/community-guidelines">Comunidad</Link>
          <Link href="/help">Ayuda</Link>
        </div>
      </footer>
    </main>
  );
}
