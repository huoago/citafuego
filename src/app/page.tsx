import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landingNav">
        <div className="brandLockup"><span>🔥</span> CitaFuego</div>
        <div className="landingNavLinks">
          <Link href="/seguridad">Seguridad</Link>
          <Link className="ghostButton" href="/iniciar-sesion">Entrar</Link>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <div className="heroPill">18+ · Lima · Perfiles reales</div>
          <h1>Haz match.<br /><span>Enciende la chispa.</span><br />Vive la cita.</h1>
          <p>CitaFuego está diseñado para conocer personas reales cerca de ti, conversar con intención y llevar una conexión a una cita real.</p>
          <div className="heroActions">
            <Link className="ctaButton" href="/registro">🔥 Empezar gratis</Link>
            <Link className="textButton" href="/registro">Cómo funciona</Link>
          </div>
          <div className="trustRow">
            <span>✓ Verificación</span><span>◉ Privacidad de ubicación</span><span>⚑ Reporte rápido</span>
          </div>
        </div>

        <div className="phonePreview" aria-label="Vista previa de CitaFuego">
          <div className="phoneGlow" />
          <div className="miniCard">
            <div className="miniPhoto" />
            <div className="miniInfo">
              <div><strong>Lucía, 27</strong> <span className="verifiedBadge">✓</span></div>
              <span>Miraflores · 1–3 km</span>
              <div className="miniChem">🔥 91% química</div>
            </div>
          </div>
        </div>
      </section>

      <section className="valueSection">
        <div className="sectionIntro">
          <p className="eyebrow">No más swipes vacíos</p>
          <h2>Diseñado para llegar a una cita real.</h2>
        </div>
        <div className="valueGrid">
          <article><span>✓</span><h3>Personas reales</h3><p>Verificación, moderación y señales de confianza desde el primer día.</p></article>
          <article><span>📍</span><h3>Cerca de ti</h3><p>Descubre personas por zonas aproximadas sin exponer coordenadas precisas.</p></article>
          <article><span>🔥</span><h3>Intención clara</h3><p>Relación, conocer gente, algo casual o simplemente ver qué pasa.</p></article>
        </div>
      </section>

      <footer className="landingFooter">
        <div className="brandLockup"><span>🔥</span> CitaFuego</div>
        <p>Solo para mayores de 18 años.</p>
      </footer>
    </main>
  );
}
