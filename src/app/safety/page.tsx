import Link from 'next/link';
import { PublicFeatureNav } from '@/components/public/PublicFeatureNav';

export default function SafetyPage(){
  return <div className="v15InfoShell v15SafetyShell">
    <PublicFeatureNav />
    <main className="v15InfoMain">
      <section className="v15InfoHero v15SafetyHero">
        <Link href="/" className="v15BackHome">← Volver al inicio</Link>
        <p className="v15Eyebrow">Seguridad primero</p>
        <h1>Centro de seguridad</h1>
        <p className="v15InfoLead">CitaFuego es exclusivamente para mayores de 18 años. Mantén tus límites claros, protege tus datos y usa Reportar o Bloquear ante cualquier conducta insegura.</p>
      </section>

      <section className="v15SafetyGrid">
        <article className="v15SafetyCard">
          <span>18+</span><h2>Solo adultos</h2>
          <p>No se permiten menores, suplantación de identidad ni perfiles que intenten eludir los controles de edad.</p>
        </article>
        <article className="v15SafetyCard">
          <span>◎</span><h2>Encuentros más seguros</h2>
          <p>Queda primero en lugares públicos, informa a alguien de confianza y evita compartir información financiera.</p>
        </article>
        <article className="v15SafetyCard">
          <span>!</span><h2>Reporta y bloquea</h2>
          <p>No toleramos amenazas, acoso, estafas, contenido sexual no solicitado ni servicios sexuales pagados.</p>
        </article>
      </section>

      <section className="v15SafetyRules">
        <div>
          <p className="v15Eyebrow">Reglas esenciales</p>
          <h2>Protege tu cuenta y tus encuentros.</h2>
        </div>
        <ul>
          <li>18+ únicamente.</li>
          <li>No prostitución, escorts, sugar dating con pago ni servicios sexuales pagados.</li>
          <li>No menores, suplantación, estafas, amenazas ni acoso.</li>
          <li>No envíes contenido sexual no solicitado.</li>
          <li>No compartas contraseñas, códigos de acceso ni datos financieros.</li>
        </ul>
      </section>

      <nav className="v15SafetyLinks" aria-label="Recursos de seguridad">
        <Link href="/">← Inicio</Link>
        <Link href="/community-guidelines">Normas de la comunidad</Link>
        <Link href="/help">Ayuda</Link>
      </nav>
    </main>
  </div>
}
