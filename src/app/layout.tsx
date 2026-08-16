import type { Metadata, Viewport } from 'next';
import './globals.css';
import './redesign.css';
import './interaction.css';

export const metadata: Metadata = {
  title: {
    default: 'CitaFuego — Personas reales. Citas reales.',
    template: '%s · CitaFuego',
  },
  description: 'Conoce personas reales cerca de ti y convierte una conexión en una cita real.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0710',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
