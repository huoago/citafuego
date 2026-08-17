export type PublicFeature = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  icon: string;
  bullets: string[];
  detail: string;
  productHref?: string;
  productLabel?: string;
};

export const publicFeatures: PublicFeature[] = [
  {
    slug: '/swipe',
    label: 'Swipe',
    eyebrow: 'Discovery & Swipe',
    title: 'Descubre personas con contexto, no solo una foto.',
    summary: 'Perfiles, intención, intereses, distancia aproximada y compatibilidad en una experiencia de decisión rápida.',
    icon: '♥',
    bullets: ['Preferencias recíprocas', 'Distancia aproximada', 'Perfil e intereses', 'Like, Pass y SuperFuego'],
    detail: 'CitaFuego ordena candidatos compatibles y evita exponer ubicación exacta. El objetivo es ayudarte a decidir con información suficiente antes de iniciar una conexión.',
    productHref: '/explorar',
    productLabel: 'Abrir exploración',
  },
  {
    slug: '/verificacion',
    label: 'Verificación',
    eyebrow: 'Verified & Safety',
    title: 'Más señales de confianza antes de conectar.',
    summary: 'Selfie, señales de confianza, teléfono e identidad opcional para reducir perfiles falsos y elevar la calidad de la comunidad.',
    icon: '✓',
    bullets: ['Selfie y revisión', 'Teléfono como señal privada', 'Identidad opcional', 'Reporte y bloqueo'],
    detail: 'La verificación es una capa de confianza, no una garantía absoluta. Se combina con moderación, controles de cuenta, bloqueo y herramientas de reporte.',
    productHref: '/safety',
    productLabel: 'Centro de seguridad',
  },
  {
    slug: '/chat-privado',
    label: 'Chat privado',
    eyebrow: 'P2P Private Chat',
    title: 'Habla sin convertir tus mensajes en un archivo central.',
    summary: 'Texto entre dispositivos mediante WebRTC DataChannel, voz y video WebRTC e historial local cifrado por dispositivo.',
    icon: '↔',
    bullets: ['Texto P2P', 'Voz y video WebRTC', 'Historial local cifrado', 'Sin persistencia del cuerpo del chat'],
    detail: 'CitaFuego conserva la relación y la señalización técnica necesarias para conectar a los usuarios, pero no persiste el cuerpo de las conversaciones como historial central.',
  },
  {
    slug: '/random-connect',
    label: 'Random',
    eyebrow: 'Random Connect',
    title: 'Rompe el hielo por texto, voz o video.',
    summary: 'Tres modos de conexión aleatoria con salida clara, controles de confianza y previsualización local antes del video remoto.',
    icon: '◉',
    bullets: ['Texto en tiempo real', 'Voz WebRTC', 'Video con preflight local', 'Bloqueo y salida visibles'],
    detail: 'El modo de video prioriza el consentimiento: primero compruebas tu cámara localmente y el contenido remoto se revela de forma explícita cuando corresponde.',
    productHref: '/azar',
    productLabel: 'Abrir Random',
  },
  {
    slug: '/para-ti-info',
    label: 'Para ti',
    eyebrow: 'For You',
    title: 'Un feed que aprende qué te resulta relevante.',
    summary: 'Recomendaciones de perfiles y contenido con señales sociales, intereses aprendidos, diversidad y feedback explícito.',
    icon: '✦',
    bullets: ['Intereses aprendidos', 'Diversidad de autores', 'No me interesa', 'Bloqueos como exclusión dura'],
    detail: 'El sistema puede usar señales de interacción y relación, pero no necesita leer el contenido privado de tus chats para construir recomendaciones.',
    productHref: '/para-ti',
    productLabel: 'Abrir Para ti',
  },
  {
    slug: '/stories-info',
    label: 'Stories',
    eyebrow: 'Stories 24 h',
    title: 'Comparte momentos con una audiencia bajo tu control.',
    summary: 'Stories de 24 horas con niveles de visibilidad, medios privados y controles de acceso.',
    icon: '○',
    bullets: ['24 horas de visibilidad', 'Público, Match, seleccionado o privado', 'Foto o video', 'Bloqueo invalida acceso'],
    detail: 'Las Stories visibles se filtran por audiencia, estado de cuenta y bloqueos. El contenido expirado deja de aparecer en el feed activo.',
    productHref: '/stories',
    productLabel: 'Abrir Stories',
  },
  {
    slug: '/blog-info',
    label: 'Blog',
    eyebrow: 'Personal Blog',
    title: 'Conoce ideas, intereses y estilo de vida antes del Match.',
    summary: 'Publicaciones con fotos o video, likes, comentarios, respuestas, guardados, menciones y privacidad por audiencia.',
    icon: '✎',
    bullets: ['Fotos y video', 'Likes y comentarios', 'Guardados y @menciones', 'Audiencia configurable'],
    detail: 'El Blog es contenido social persistente y separado del chat privado. Cada publicación conserva sus propias reglas de visibilidad y moderación.',
    productHref: '/blog',
    productLabel: 'Abrir Blog',
  },
  {
    slug: '/album-privado',
    label: 'Álbum privado',
    eyebrow: 'Private Album',
    title: 'Comparte medios privados solo con el Match que elijas.',
    summary: 'Acceso temporal, revocable y limitado por visualizaciones sobre almacenamiento privado.',
    icon: '🔒',
    bullets: ['Solo para Match', 'Caducidad', 'Vistas limitadas', 'Acceso revocable'],
    detail: 'Los archivos permanecen en almacenamiento privado y se sirven mediante acceso autorizado de corta duración. Las medidas de interfaz disuaden la descarga ordinaria, pero no pueden impedir capturas de pantalla de un usuario autorizado.',
    productHref: '/albumes',
    productLabel: 'Abrir álbumes',
  },
  {
    slug: '/match-intelligence',
    label: 'Match IA',
    eyebrow: 'Match Intelligence',
    title: 'Compatibilidad que va más allá de la distancia.',
    summary: 'Señales de Dating, relación social e intereses aprendidos se combinan para ordenar mejores posibilidades.',
    icon: '🔥',
    bullets: ['Preferencias recíprocas', 'Compatibilidad e intención', 'Señales sociales', 'Intereses y feedback'],
    detail: 'La recomendación excluye cuentas bloqueadas o no elegibles y trabaja con ubicación aproximada. El ranking busca relevancia sin sacrificar diversidad ni controles de seguridad.',
    productHref: '/explorar',
    productLabel: 'Ver recomendaciones',
  },
  {
    slug: '/premium-info',
    label: 'Premium',
    eyebrow: 'CitaFuego Premium',
    title: 'Más control y visibilidad cuando quieras acelerar.',
    summary: 'Boost, SuperFuego, Who Likes You y filtros avanzados complementan el producto base.',
    icon: '★',
    bullets: ['Boost', 'SuperFuego', 'Who Likes You', 'Filtros avanzados'],
    detail: 'Premium añade herramientas de descubrimiento y visibilidad. Las capacidades sujetas a plan se validan en el producto, no solo en la interfaz.',
    productHref: '/premium',
    productLabel: 'Ver Premium',
  },
  {
    slug: '/seguridad-privacidad',
    label: 'Seguridad',
    eyebrow: 'Safety + Privacy',
    title: 'La confianza forma parte de la arquitectura del producto.',
    summary: '18+, ubicación aproximada, almacenamiento privado, controles de audiencia, moderación, bloqueo y reportes.',
    icon: '◇',
    bullets: ['Solo adultos 18+', 'Sin ubicación exacta pública', 'Almacenamiento privado', 'Bloqueo y reporte inmediatos'],
    detail: 'CitaFuego separa contenido social persistente de conversaciones privadas P2P y aplica controles de acceso en las superficies sensibles.',
    productHref: '/safety',
    productLabel: 'Centro de seguridad',
  },
];

export function getPublicFeature(slug: string) {
  return publicFeatures.find((feature) => feature.slug === slug);
}
