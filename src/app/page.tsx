/* eslint-disable @next/next/no-html-link-for-pages */
import {HomeDirectoryEnhancements} from '@/components/public/HomeDirectoryEnhancements';
import styles from './home.module.css';

type PreviewProfile={id:string;name:string;age:number;district:string;gender:'mujer'|'hombre';connection:'citas'|'amistad'|'video';tagline:string;verified:boolean;online:boolean;media:string[]};

const previewProfiles:PreviewProfile[]=[
  {id:'p1',name:'Lucía',age:27,district:'Miraflores',gender:'mujer',connection:'citas',tagline:'Café, viajes y conversaciones sin prisa.',verified:true,online:true,media:['2 fotos','audio']},
  {id:'p2',name:'Mateo',age:31,district:'Barranco',gender:'hombre',connection:'amistad',tagline:'Música, fotografía y planes de fin de semana.',verified:true,online:false,media:['3 fotos']},
  {id:'p3',name:'Valeria',age:29,district:'Surco',gender:'mujer',connection:'video',tagline:'Primero conversar, luego vemos qué surge.',verified:true,online:true,media:['video','2 fotos']},
  {id:'p4',name:'Diego',age:33,district:'San Borja',gender:'hombre',connection:'citas',tagline:'Cocina, running y escapadas fuera de Lima.',verified:false,online:true,media:['2 fotos']},
  {id:'p5',name:'Camila',age:26,district:'Lince',gender:'mujer',connection:'amistad',tagline:'Arte, perros y descubrir lugares nuevos.',verified:true,online:false,media:['4 fotos']},
  {id:'p6',name:'Andrés',age:35,district:'La Molina',gender:'hombre',connection:'video',tagline:'Conversaciones claras y conexiones reales.',verified:true,online:false,media:['audio','2 fotos']},
  {id:'p7',name:'Sofía',age:30,district:'Jesús María',gender:'mujer',connection:'citas',tagline:'Libros, gastronomía y una buena primera cita.',verified:true,online:true,media:['3 fotos']},
  {id:'p8',name:'Nicolás',age:28,district:'Miraflores',gender:'hombre',connection:'amistad',tagline:'Viajes, cine y conocer gente nueva.',verified:false,online:false,media:['2 fotos']},
];

const districtLinks=[
  ['Miraflores','/lima/miraflores'],['Surco','/lima/santiago-de-surco'],['San Borja','/lima/san-borja'],['Barranco','/lima/barranco'],
  ['Lince','/lima/lince'],['La Molina','/lima/la-molina'],['Jesús María','/lima/jesus-maria'],['San Isidro','/lima/san-isidro'],
] as const;

export default function LandingPage(){
  return <main className={styles.page} data-home-page>
    <div className={styles.trustStrip}>🔥 CitaFuego · Solo adultos 18+ · perfiles y contenido sujetos a controles de seguridad y moderación</div>

    <div className={styles.shell}>
      <HomeDirectoryEnhancements/>

      <section className={styles.directorySection} aria-label="Vista previa de perfiles">
        <div data-preview-grid data-grid-class={styles.profileGrid} data-list-class={styles.profileList} className={styles.profileGrid}>
          {previewProfiles.map((profile,index)=><article
            className={styles.profilePreview}
            key={profile.id}
            data-preview-profile
            data-connection={profile.connection}
            data-gender={profile.gender}
            data-district={profile.district}
            data-verified={String(profile.verified)}
            data-online={String(profile.online)}
            data-search={`${profile.name} ${profile.district} ${profile.tagline}`.toLowerCase()}
          >
            <div className={`${styles.previewPhoto} ${styles[`previewTone${(index%4)+1}`]}`}>
              <span className={styles.previewBadge}>Vista previa</span>
              {profile.online?<span className={styles.onlineBadge}>● Activo ahora</span>:null}
              <div className={styles.previewSilhouette} aria-hidden="true"><span>●</span><b>●</b></div>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewName}><strong>{profile.name}, {profile.age}</strong>{profile.verified?<span title="Perfil verificado">✓</span>:null}</div>
              <p style={{color:'#626b76'}}>{profile.district} · <span data-distance-label>≤ 10 km</span></p>
              <div className={styles.mediaTags}>{profile.media.map(item=><span key={item}>{item}</span>)}</div>
              <p className={styles.tagline}>{profile.tagline}</p>
              <div className={styles.previewActions}><a href="/descubrir">Ver perfiles</a><a href="/registro">Crear perfil</a></div>
            </div>
          </article>)}
        </div>
        <div className={styles.noResults} data-preview-empty hidden><strong>No hay vistas previas con esos filtros.</strong><button type="button" data-reset-preview>Restablecer filtros</button></div>
        <div className={styles.directoryCta}><a className={styles.primaryCta} href="/registro">Crear mi perfil</a><a className={styles.secondaryCta} href="/iniciar-sesion">Ya tengo cuenta</a></div>
      </section>

      <section className={styles.explainer} aria-labelledby="citas-lima">
        <p className={styles.eyebrow}>CitaFuego en Lima</p>
        <h2 id="citas-lima">Conoce personas reales con más contexto antes de conversar</h2>
        <p>CitaFuego está diseñado como una plataforma de citas y conexiones entre adultos. La experiencia prioriza intención de relación, distrito aproximado, intereses, señales de verificación y controles de privacidad. No publicamos direcciones exactas ni convertimos los perfiles en anuncios de servicios.</p>
        <div className={styles.explainerGrid}>
          <article><strong>Explora</strong><span>Filtra por zona, intención y señales de confianza.</span></article>
          <article><strong>Conecta</strong><span>Like mutuo antes de abrir una conversación privada.</span></article>
          <article><strong>Controla</strong><span>Bloqueo, denuncia, verificación y privacidad desde la cuenta.</span></article>
        </div>
      </section>

      <section className={styles.linkSection} aria-label="Distritos de Lima">
        <h2>Distritos principales de Lima</h2>
        <div className={styles.linkCloud}>{districtLinks.map(([label,href])=><a href={href} key={href}>{label}</a>)}<a href="/lima">+ Ver todos</a></div>
      </section>

      <section className={styles.linkSection} aria-label="Funciones más usadas">
        <h2>Lo más usado en CitaFuego</h2>
        <div className={styles.linkCloud}>
          <a href="/verificacion">Perfiles verificados</a>
          <a href="/como-funciona">Cómo funciona</a>
          <a href="/seguridad-privacidad">Privacidad</a>
          <a href="/safety">Consejos de seguridad</a>
          <a href="/guias">Guías para citas</a>
          <a href="/registro">Crear perfil</a>
        </div>
      </section>
    </div>

    <footer className={styles.footer}>
      <div><strong>🔥 CitaFuego</strong><span>Contenido y comunidad solo para mayores de 18 años.</span></div>
      <nav><a href="/terminos">Términos</a><a href="/privacidad">Privacidad</a><a href="/community-guidelines">Comunidad</a><a href="/safety">Seguridad</a><a href="/help">Ayuda</a></nav>
    </footer>
  </main>;
}
