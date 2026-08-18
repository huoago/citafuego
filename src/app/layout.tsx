import type { Metadata, Viewport } from 'next';
import './globals.css';
import './redesign.css';
import './interaction.css';
import './growth.css';
import './blog.css';
import './recommendations.css';
import './monetization.css';
import './top-tier.css';
import './ios-social.css';
import './ios-v2.css';
import './auth-safety-v3.css';
import './chat-read-v7.css';
import './registration-v9.css';
import './whatsapp-contact.css';
import './v14-onboarding-fixes.css';
import './v15-public-polish.css';
import { PwaRegistrar } from '@/components/pwa-registrar';

export const metadata: Metadata = {
  title: { default: 'CitaFuego — Personas reales. Citas reales.', template: '%s · CitaFuego' },
  description: 'Conoce personas reales cerca de ti y convierte una conexión en una cita real.',
  applicationName:'CitaFuego',
  manifest:'/manifest.webmanifest',
  icons:{icon:'/icon.svg'},
  appleWebApp:{capable:true,title:'CitaFuego',statusBarStyle:'black-translucent'},
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit:'cover', themeColor: '#08080b' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body><PwaRegistrar/>{children}</body></html>}
