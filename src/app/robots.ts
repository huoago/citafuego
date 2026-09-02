import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots():MetadataRoute.Robots{
  return {
    rules:[
      {
        userAgent:'*',
        allow:'/',
        disallow:[
          '/admin/','/api/','/chat/','/chat-privado/','/chats/','/messages/','/account/','/cuenta/','/configuracion/','/settings/',
          '/verification/','/verificacion/','/private-album/','/album-privado/','/perfil/','/matches/','/likes/','/para-ti/','/descubrir/',
          '/guardados/','/albumes/','/premium/','/onboarding/','/registro/completar/','/bloqueados/','/reportes/','/usuario/','/citas/',
        ],
      },
    ],
    sitemap:`${SITE_URL}/sitemap.xml`,
    host:SITE_URL,
  };
}
