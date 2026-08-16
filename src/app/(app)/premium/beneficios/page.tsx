import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadPeruCatalog, formatPrice } from '@/lib/billing/catalog';

const labels: Record<string, string> = {
  daily_like_limit: 'Likes diarios',
  can_see_likers: 'Ver quién te dio Like',
  rewind_limit: 'Recuperar perfiles con Rewind',
  advanced_filters: 'Filtros avanzados',
  incognito_mode: 'Modo incógnito',
  boosts_per_period: 'Boost por periodo',
  superfuegos_per_period: 'SuperFuego por periodo',
};

export default async function BenefitsPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const offers = (await loadPeruCatalog()).filter((offer) => offer.kind === 'subscription');
  const offer = offers.find((item) => item.id === plan);
  if (!offer) notFound();

  const benefits = Object.entries(offer.entitlements).filter(([, value]) => value !== false && value !== 0);

  return (
    <section>
      <div className="pageHeader">
        <p className="eyebrow">Detalle del plan</p>
        <h1>{offer.name}</h1>
        <p className="muted">{formatPrice(offer.price)}</p>
      </div>

      <div className="softPanel">
        <h2>Qué desbloquea</h2>
        <div className="settingsList">
          {benefits.map(([key, value]) => (
            <div className="safetyRow" key={key}>
              <span><strong>{labels[key] ?? key}</strong><small>Gestionado por permisos del servidor</small></span>
              <span className="completionBadge">{typeof value === 'number' && value < 9000 ? String(value) : 'Incluido'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="softPanel">
        <h2>Explora las funciones</h2>
        <p>La compra no se simula: mientras no haya una pasarela de cobro activa, CitaFuego solo muestra funciones que existen realmente en el producto.</p>
        <div className="heroActions">
          <Link className="ctaButton" href="/premium/filtros">Ver filtros</Link>
          <Link className="ghostButton" href="/likes">Ver Likes</Link>
          <Link className="ghostButton" href="/premium">Comparar planes</Link>
        </div>
      </div>
    </section>
  );
}
