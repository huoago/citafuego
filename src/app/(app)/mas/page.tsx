import Link from 'next/link';

const items = [
  ['/para-ti','Para ti','Contenido y recomendaciones personalizadas'],
  ['/stories','Stories','Historias disponibles durante 24 horas'],
  ['/blog','Blog','Tu contenido, privacidad y comunidad'],
  ['/azar','Azar','Conexiones aleatorias de texto, voz o video'],
  ['/notificaciones','Notificaciones','Actividad reciente y avisos'],
  ['/guardados','Guardados','Contenido que decidiste conservar'],
  ['/boost','Boost','Aumenta temporalmente tu visibilidad'],
  ['/premium','Premium','Planes, filtros y funciones avanzadas'],
  ['/seguridad','Seguridad','Bloqueos, reportes y controles'],
];

export default function MorePage(){
  return <section><div className="pageHeader"><p className="eyebrow">Más de CitaFuego</p><h1>Todo en un solo lugar</h1><p className="muted">Accede a funciones secundarias sin recargar la navegación principal.</p></div><div className="settingsList">{items.map(([href,title,copy])=><Link className="safetyRow" href={href} key={href}><span><strong>{title}</strong><small>{copy}</small></span><span>›</span></Link>)}</div></section>;
}
