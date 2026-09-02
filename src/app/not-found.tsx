import Link from 'next/link';

export default function NotFound(){
  return <main className="legalPage">
    <p className="eyebrow">404</p>
    <h1>Esta página no existe</h1>
    <p>El enlace puede haber cambiado o la página ya no está disponible.</p>
    <p><Link href="/">Volver a CitaFuego</Link> · <Link href="/lima">Explorar Lima</Link> · <Link href="/help">Ayuda</Link></p>
  </main>;
}
