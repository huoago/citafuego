import Link from 'next/link';
import styles from './home.module.css';

const trustItems = [
  ['18+', 'Solo adultos'],
  ['✓', 'Verificación y controles de confianza'],
  ['◉', 'Ubicación aproximada, no exacta'],
  ['↔', 'Chat P2P con historial local cifrado'],
];

const randomModes = [
  { icon: 'Aa', title: 'Texto', copy: 'Conecta por texto en tiempo real sin guardar el contenido del chat en el servidor.' },
  { icon: '◖', title: 'Voz', copy: 'Habla por WebRTC cuando ambos están listos, con controles de salida y bloqueo visibles.' },
  { icon: '▣', title: 'Video', copy: 'Vista previa local, confirmación mutua y revelado explícito antes de mostrar el video remoto.' },
];

const safetyCards = [
  ['✓', 'Perfil verificado', 'Selfie y señales de confianza para reducir perfiles falsos.'],
  ['ID', 'Identidad opcional', 'Flujo preparado para verificación documental mediante proveedor especializado.'],
  ['☎', 'Teléfono verificado', 'Una señal adicional de confianza sin mostrar tu número en el perfil.'],
  ['⚑', 'Reporte y bloqueo', 'Bloquea el acceso de inmediato y reporta perfiles o contenido desde el producto.'],
  ['◉', 'Privacidad por diseño', 'Sin ubicación exacta pública y con controles de visibilidad para blog, Story y álbumes.'],
  ['◇', 'Moderación', 'Imágenes y contenido pasan por reglas de seguridad y revisión cuando corresponde.'],
];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label="CitaFuego inicio">
          <span className={styles.brandMark}>🔥</span>
          <span>CitaFuego</span>
        </Link>
        <nav className={styles.navLinks} aria-label="Navegación pública">
          <a href="#producto">Producto</a>
          <a href="#seguridad">Seguridad</a>
          <a href="#premium">Premium</a>
          <Link href="/como-funciona">Cómo funciona</Link>
        </nav>
        <div className={styles.navActions}>
          <Link className={styles.loginLink} href="/iniciar-sesion">Entrar</Link>
          <Link className={styles.primarySmall} href="/registro">Crear perfil</Link>
        </div>
      </header>

      <section className={styles.hero} id="producto">
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>Dating + social privado para adultos en Latinoamérica</div>
          <h1>Conoce personas.<br />Siente la química.<br /><span>Conserva el control.</span></h1>
          <p className={styles.heroLead}>
            CitaFuego combina descubrimiento, Match, contenido social y conversaciones privadas para que conozcas a alguien con más contexto y menos ruido.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/registro">🔥 Crear mi perfil</Link>
            <Link className={styles.secondary} href="/explorar">Explorar CitaFuego</Link>
          </div>
          <div className={styles.heroTrust}>
            <span>18+ solamente</span>
            <span>Perfiles con señales de confianza</span>
            <span>Privacidad desde el diseño</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Vista de producto CitaFuego con datos de demostración">
          <div className={styles.orbitOne} />
          <div className={styles.orbitTwo} />
          <div className={styles.cardBackTwo} />
          <div className={styles.cardBackOne} />
          <div className={styles.swipeCard}>
            <div className={styles.demoLabel}>Vista del producto · datos de ejemplo</div>
            <div className={styles.heroPhoto} />
            <div className={styles.photoDots}><b /><b /><b /><b /></div>
            <div className={styles.cardShade} />
            <div className={styles.cardContent}>
              <div className={styles.nameRow}>
                <strong>Lucía, 27</strong><span className={styles.verified}>✓</span>
              </div>
              <p>Miraflores · 1–3 km</p>
              <div className={styles.intention}>Conocer y ver qué pasa</div>
              <div className={styles.chipRow}>
                <span>☕ Café</span><span>✈ Viajes</span><span>♫ Música</span>
              </div>
              <div className={styles.chemistry}>🔥 91% compatibilidad</div>
            </div>
          </div>
          <div className={styles.swipeActions} aria-hidden="true">
            <span className={styles.pass}>×</span>
            <span className={styles.super}>★</span>
            <span className={styles.like}>♥</span>
          </div>
        </div>
      </section>

      <section className={styles.trustStrip} aria-label="Principios de confianza de CitaFuego">
        {trustItems.map(([icon, label]) => (
          <div key={label}><span>{icon}</span><strong>{label}</strong></div>
        ))}
      </section>

      <section className={styles.section} id="seguridad">
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>Verified & Safety</p>
          <h2>Más señales para decidir.<br />Más control para cuidarte.</h2>
          <p>La confianza no es una insignia decorativa: está integrada en perfiles, descubrimiento, random, contenidos, reportes y bloqueo.</p>
        </div>
        <div className={styles.safetyGrid}>
          {safetyCards.map(([icon, title, copy]) => (
            <article key={title} className={styles.safetyCard}>
              <span className={styles.safetyIcon}>{icon}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.chatSection}`}>
        <div className={styles.chatMock} aria-label="Demostración del chat privado de CitaFuego">
          <div className={styles.chatTop}>
            <div className={styles.chatAvatar}>M</div>
            <div><strong>María</strong><span>Match · en línea</span></div>
            <b>⋯</b>
          </div>
          <div className={styles.messageStack}>
            <div className={styles.messageIncoming}>¿Un café por Barranco esta semana?</div>
            <div className={styles.messageOutgoing}>Sí. El jueves después de las 7 me va bien 🔥</div>
            <div className={styles.messageIncoming}>Perfecto. Primero elegimos un lugar público.</div>
          </div>
          <div className={styles.deviceNote}>🔒 Historial cifrado en este dispositivo · contenido no persistido por CitaFuego</div>
          <div className={styles.chatComposer}><span>Escribe un mensaje…</span><b>➤</b></div>
        </div>
        <div className={styles.sideCopy}>
          <p className={styles.eyebrow}>P2P private chat</p>
          <h2>Tu conversación no tiene que convertirse en nuestro archivo.</h2>
          <p>El chat compatible viaja entre dispositivos mediante WebRTC y el historial se guarda cifrado localmente. CitaFuego conserva la relación necesaria para Match, presencia y señalización, no el cuerpo de tus conversaciones.</p>
          <ul className={styles.checkList}>
            <li>Texto P2P mediante DataChannel</li>
            <li>Voz y video mediante WebRTC</li>
            <li>Historial local cifrado por dispositivo</li>
            <li>Bloqueo y reporte separados del contenido del chat</li>
          </ul>
          <Link className={styles.inlineLink} href="/safety">Conoce nuestro enfoque de seguridad →</Link>
        </div>
      </section>

      <section className={`${styles.section} ${styles.randomSection}`}>
        <div className={styles.sectionHeadCenter}>
          <p className={styles.eyebrow}>Random Connect</p>
          <h2>Tres formas de romper el hielo.</h2>
          <p>Empieza por el formato que te resulte cómodo y conserva siempre una salida clara.</p>
        </div>
        <div className={styles.modeGrid}>
          {randomModes.map((mode) => (
            <article key={mode.title} className={styles.modeCard}>
              <span className={styles.modeIcon}>{mode.icon}</span>
              <h3>{mode.title}</h3>
              <p>{mode.copy}</p>
              <span className={styles.modeMeta}>Match aleatorio · usuarios habilitados</span>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.socialSection}`}>
        <div className={styles.socialCopy}>
          <p className={styles.eyebrow}>For You · Stories · Blog</p>
          <h2>Conoce a la persona antes de decidir si hay química.</h2>
          <p>El perfil ya no es una ficha aislada. Puedes descubrir contenido, intereses, Stories y publicaciones permitidas por cada usuario, seguir personas y construir contexto antes de hacer Match.</p>
          <div className={styles.socialLinks}>
            <Link href="/para-ti">Para ti</Link>
            <Link href="/stories">Stories</Link>
            <Link href="/blog">Blog</Link>
          </div>
        </div>
        <div className={styles.feedMock} aria-label="Vista conceptual de Para ti, Stories y Blog">
          <div className={styles.storyRail}>
            <div><span className={styles.storyOne} /><b>Valentina</b></div>
            <div><span className={styles.storyTwo} /><b>Diego</b></div>
            <div><span className={styles.storyThree} /><b>Sofía</b></div>
            <div><span className={styles.storyFour} /><b>Marco</b></div>
          </div>
          <article className={styles.feedCard}>
            <div className={styles.feedAuthor}><span className={styles.authorAvatar}>A</span><div><b>Ana</b><small>@ana.lima · 12 min</small></div><strong>Seguir</strong></div>
            <p>Domingo de café, libros y caminar sin prisa. ¿Tu plan ideal?</p>
            <div className={styles.feedPhoto} />
            <div className={styles.feedActions}><span>♡ 128</span><span>◌ 19</span><span>↗ Compartir</span><span>☆ Guardar</span></div>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.albumSection}`}>
        <div className={styles.albumVisual} aria-label="Vista conceptual de un álbum privado">
          <div className={styles.albumPhone}>
            <div className={styles.albumHeader}><span>‹</span><b>Álbum privado</b><span>•••</span></div>
            <div className={styles.albumLock}>🔒</div>
            <h3>Solo para este Match</h3>
            <p>Acceso temporal y revocable</p>
            <div className={styles.albumGrid}>
              <div className={styles.albumPicOne} /><div className={styles.albumPicTwo} /><div className={styles.albumPicThree} /><div className={styles.albumPicFour} />
            </div>
            <div className={styles.albumBadge}>1 vista · expira en 24 h</div>
          </div>
        </div>
        <div className={styles.sideCopy}>
          <p className={styles.eyebrow}>Private Album</p>
          <h2>Compartir algo privado no debería volverlo público.</h2>
          <p>Crea álbumes privados para Matches, controla cuánto duran, limita visualizaciones y revoca el acceso. Los archivos viven en almacenamiento privado y se sirven mediante URLs firmadas de corta duración.</p>
          <div className={styles.featurePills}>
            <span>Solo Match</span><span>Caducidad</span><span>Vistas limitadas</span><span>Revocar acceso</span><span>Moderación</span><span>Watermark</span>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.algorithmSection}`}>
        <div className={styles.sectionHeadCenter}>
          <p className={styles.eyebrow}>Match Intelligence</p>
          <h2>No recomendamos solo por distancia.</h2>
          <p>CitaFuego combina señales de compatibilidad, relación social e intereses aprendidos para ordenar mejor las posibilidades.</p>
        </div>
        <div className={styles.engineGrid}>
          <article><span>01</span><h3>Dating</h3><p>Edad, preferencias recíprocas, intención, distancia aproximada y señales de compatibilidad.</p></article>
          <article><span>02</span><h3>Social</h3><p>Follow, visitas, Story, Blog, Likes, comentarios, guardados, Match y actividad reciente.</p></article>
          <article><span>03</span><h3>Content</h3><p>Temas e intereses que el sistema aprende con tus elecciones y feedback explícito.</p></article>
        </div>
        <div className={styles.algorithmFooter}>
          <span>No me interesa</span><span>Ocultar autor</span><span>Diversidad</span><span>Cold start</span><span>A/B testing</span>
        </div>
      </section>

      <section className={`${styles.section} ${styles.premiumSection}`} id="premium">
        <div className={styles.premiumCopy}>
          <p className={styles.eyebrow}>CitaFuego Premium</p>
          <h2>Más control cuando quieras acelerar.</h2>
          <p>El producto base sigue centrado en conocer personas. Premium añade herramientas de descubrimiento y visibilidad sin convertir cada interacción en una compra.</p>
          <Link className={styles.primary} href="/premium">Ver Premium</Link>
        </div>
        <div className={styles.premiumCards}>
          <article><span>🔥</span><h3>Boost</h3><p>Más visibilidad durante una ventana limitada.</p></article>
          <article><span>★</span><h3>SuperFuego</h3><p>Una señal destacada cuando realmente quieres llamar la atención.</p></article>
          <article><span>♥</span><h3>Who Likes You</h3><p>Descubre quién ya mostró interés cuando tu plan lo incluye.</p></article>
          <article><span>⌁</span><h3>Filtros avanzados</h3><p>Ajusta mejor lo que buscas sin exponer datos privados.</p></article>
        </div>
      </section>

      <section className={styles.privacyBanner}>
        <div>
          <p className={styles.eyebrow}>Safety + privacy</p>
          <h2>El crecimiento importa. La confianza importa más.</h2>
          <p>18+, ubicación aproximada, almacenamiento privado, controles de audiencia, bloqueo inmediato, moderación y una arquitectura que evita guardar el contenido de tus chats como historial central.</p>
        </div>
        <div className={styles.privacyActions}>
          <Link className={styles.primary} href="/seguridad">Centro de seguridad</Link>
          <Link className={styles.secondary} href="/privacidad">Privacidad</Link>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.ctaGlow} />
        <div className={styles.ctaContent}>
          <p className={styles.eyebrow}>CitaFuego</p>
          <h2>Menos ruido. Más contexto. Más química.</h2>
          <p>Crea tu perfil, define lo que buscas y empieza a descubrir personas con más información y más control.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/registro">🔥 Crear mi perfil</Link>
            <Link className={styles.secondary} href="/iniciar-sesion">Ya tengo cuenta</Link>
          </div>
          <small>Solo para personas adultas de 18 años o más.</small>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <div className={styles.brand}><span className={styles.brandMark}>🔥</span><span>CitaFuego</span></div>
          <p>Dating y social privado para adultos.</p>
        </div>
        <div className={styles.footerLinks}>
          <div><b>Producto</b><Link href="/explorar">Explorar</Link><Link href="/como-funciona">Cómo funciona</Link><Link href="/premium">Premium</Link></div>
          <div><b>Seguridad</b><Link href="/safety">Safety</Link><Link href="/community-guidelines">Comunidad</Link><Link href="/help">Ayuda</Link></div>
          <div><b>Legal</b><Link href="/terminos">Términos</Link><Link href="/privacidad">Privacidad</Link></div>
        </div>
        <div className={styles.footerBottom}>© 2026 CitaFuego · Solo adultos 18+</div>
      </footer>
    </main>
  );
}
