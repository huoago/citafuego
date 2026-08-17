import Link from 'next/link';

const rows=[
  ['Perfil verificado','Selfie + fotos aprobadas','Activo'],
  ['Chat privado','Contenido solo en los dispositivos','Activo'],
  ['Ubicación','Solo distancia aproximada','Activo'],
  ['Bloqueo y reportes','Disponible en perfiles y sesiones','Activo'],
  ['Moderación visual automática','Se activa solo con proveedor aprobado','Pendiente de proveedor'],
  ['Verificación con documento','Se activa solo con proveedor ID/liveness aprobado','Pendiente de proveedor'],
  ['Verificación telefónica','Se activa solo con proveedor SMS/anti-bot aprobado','Pendiente de proveedor'],
];

export default function TrustPage(){return <main className="marketingPage"><section className="marketingHero"><p className="eyebrow">Trust Center</p><h1>La confianza no se simula.</h1><p className="muted">CitaFuego separa claramente las protecciones activas de las capacidades que dependen de proveedores externos todavía no habilitados.</p><div className="heroActions"><Link className="ctaButton" href="/safety">Centro de seguridad</Link><Link className="ghostButton" href="/registro">Crear cuenta</Link></div></section><section className="marketingGrid">{rows.map(([title,copy,status])=><article className="softPanel" key={title}><small>{status}</small><h2>{title}</h2><p>{copy}</p></article>)}</section></main>}
