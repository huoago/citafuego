import Link from 'next/link';
import { loadPeruCatalog, formatPrice } from '@/lib/billing/catalog';

const labels: Record<string, string> = {
  daily_like_limit: 'Likes diarios',
  can_see_likers: 'Quién te dio Like',
  rewind_limit: 'Rewind',
  advanced_filters: 'Filtros avanzados',
  incognito_mode: 'Modo incógnito',
  boosts_per_period: 'Boost',
  superfuegos_per_period: 'SuperFuego',
};

function entitlementList(entitlements: Record<string, unknown>) {
  return Object.entries(entitlements)
    .filter(([, value]) => value !== false && value !== 0)
    .map(([key, value]) => `${labels[key] ?? key}${typeof value === 'number' && value < 9000 ? `: ${value}` : ''}`);
}

export default async function PremiumPage() {
  const offers = (await loadPeruCatalog()).filter((offer) => offer.kind === 'subscription');

  return (
    <section>
      <div className="pageHeader">
        <p className="eyebrow">Premium transparente</p>
        <h1>Elige tu Fuego</h1>
        <p className="muted">Compara derechos reales del servidor. No mostramos funciones que tu cuenta no pueda usar.</p>
      </div>

      <div className="planStack">
        {offers.map((offer) => (
          <article className={offer.tier === 'gold' ? 'planCard featuredPlan' : 'planCard'} key={offer.id}>
            {offer.tier === 'gold' ? <span className="popularTag">Más completo</span> : null}
            <h2>{offer.name}</h2>
            <strong>{formatPrice(offer.price)}</strong>
            <ul>{entitlementList(offer.entitlements).map((benefit) => <li key={benefit}>✓ {benefit}</li>)}</ul>
            {offer.tier === 'free' ? (
              <div className="planStatus">Plan base activo</div>
            ) : (
              <Link className="ctaButton fullWidth" href={`/premium/beneficios?plan=${encodeURIComponent(offer.id)}`}>
                Ver beneficios
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
