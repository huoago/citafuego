import type { Metadata } from 'next';

export const SITE_URL='https://citafuego.com';
export const SITE_NAME='CitaFuego';
export const DEFAULT_TITLE='CitaFuego — Personas reales. Citas reales.';
export const DEFAULT_DESCRIPTION='Conoce personas reales cerca de ti en Lima con controles de seguridad, privacidad y perfiles reales.';

export const PUBLIC_INDEXABLE_ROUTES=[
  '/',
  '/como-funciona',
  '/community-guidelines',
  '/help',
  '/safety',
  '/terminos',
  '/privacidad',
  '/explorar',
  '/seguridad-privacidad',
  '/blog-info',
  '/para-ti-info',
  '/stories-info',
  '/match-intelligence',
];

export const PRIVATE_ROUTE_PREFIXES=[
  '/admin','/api','/chat','/chat-privado','/chats','/messages','/account','/cuenta','/configuracion','/settings',
  '/verification','/verificacion','/private-album','/album-privado','/perfil','/matches','/likes','/para-ti','/descubrir',
  '/guardados','/albumes','/premium','/onboarding','/registro/completar','/bloqueados','/reportes','/usuario','/citas',
];

export function absoluteUrl(path='/'){
  return new URL(path,SITE_URL).toString();
}

export function publicMetadata({title,description,path,image='/opengraph-image'}:{title:string;description:string;path:string;image?:string}):Metadata{
  const canonical=absoluteUrl(path);
  const imageUrl=absoluteUrl(image);
  return {
    title,
    description,
    alternates:{canonical},
    openGraph:{
      type:'website',
      url:canonical,
      siteName:SITE_NAME,
      locale:'es_PE',
      title,
      description,
      images:[{url:imageUrl,width:1200,height:630,alt:`${SITE_NAME}: ${title}`}],
    },
    twitter:{card:'summary_large_image',title,description,images:[imageUrl]},
    robots:{index:true,follow:true},
  };
}

export const privateMetadata:Metadata={
  robots:{index:false,follow:false,noarchive:true,nosnippet:true},
};
