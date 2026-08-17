import type { MetadataRoute } from 'next';

export default function pwaManifest(): MetadataRoute.Manifest {
  return {
    name: 'CitaFuego',
    short_name: 'CitaFuego',
    description: 'Conoce personas reales, conecta con privacidad y controla tu experiencia.',
    start_url: '/descubrir',
    display: 'standalone',
    background_color: '#0b0710',
    theme_color: '#0b0710',
    orientation: 'portrait',
    categories: ['social', 'lifestyle'],
    lang: 'es',
  };
}
