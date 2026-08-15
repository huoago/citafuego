'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DiscoverProfile } from '@/lib/types';

export function DiscoverDeck({
  initialProfiles,
  initialHasMore,
}: {
  initialProfiles: DiscoverProfile[];
  initialHasMore: boolean;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const profile = profiles[index];

  async function refill() {
    if (busy || !hasMore) return;
    setBusy(true);
    const response = await fetch('/api/discovery?offset=0');
    const data = await response.json();
    setBusy(false);
    if (response.ok) {
      const next = (data.profiles ?? []) as DiscoverProfile[];
      setProfiles(next);
      setIndex(0);
      setHasMore(Boolean(data.hasMore));
    }
  }

  async function decide(action: 'pass' | 'like' | 'superfuego') {
    if (!profile || busy) return;
    setBusy(true);
    const response = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ toUserId: profile.id, action }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setToast(
        data.error === 'daily_like_limit_reached'
          ? 'Llegaste al límite de likes de hoy.'
          : data.error === 'superfuego_required'
            ? 'Necesitas Fuego Gold o créditos SuperFuego.'
            : data.error === 'superfuego_limit_reached'
              ? 'Usaste tus SuperFuego incluidos de este periodo.'
              : 'No pudimos guardar la acción.',
      );
      return;
    }

    if (data.matched) {
      setToast(`🔥 ¡Match con ${profile.name}!`);
      window.setTimeout(() => router.push(`/chats/${data.conversation_id}`), 700);
      return;
    }

    setToast(
      action === 'superfuego'
        ? `🔥 SuperFuego enviado a ${profile.name}`
        : action === 'like'
          ? `Like enviado a ${profile.name}`
          : 'Perfil omitido',
    );
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= profiles.length && hasMore) void refill();
  }

  async function rewind() {
    setBusy(true);
    const response = await fetch('/api/rewind', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (response.status === 402) {
      setToast('Rewind es una función Fuego Plus.');
      return;
    }
    if (!response.ok || !data.rewound) {
      setToast('No hay un perfil para recuperar.');
      return;
    }
    setToast('Perfil recuperado.');
    await refill();
  }

  if (!profile) {
    return (
      <section className="emptyState">
        <h1>Eso es todo por ahora</h1>
        <p>CitaFuego no rellena el feed con perfiles falsos.</p>
        {hasMore ? (
          <button className="ctaButton" onClick={() => void refill()}>
            Cargar más
          </button>
        ) : (
          <Link className="ctaButton" href="/onboarding?edit=1">
            Revisar preferencias
          </Link>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="discoverTopline">
        <div>
          <p className="eyebrow">Lima · resultados reales</p>
          <h1>Descubrir</h1>
        </div>
        <Link className="filterButton" href="/premium/filtros">Filtros</Link>
      </div>
      <article className="profileCard">
        <div className="profileMedia">
          <Image src={profile.imageUrl} alt={`Foto de ${profile.name}`} fill priority sizes="(max-width:560px) 100vw,520px" />
          <div className="mediaShade" />
          <div className="profileOverlay">
            <div className="nameLine">
              <h2>{profile.name}, {profile.age}</h2>
              {profile.verified ? <span className="verifiedBadge">✓</span> : null}
            </div>
            <p>{profile.district} · {profile.distanceBucket}</p>
            <div className="chemistryBadge">🔥 {profile.chemistryScore}% química</div>
          </div>
        </div>
        <div className="profileBody">
          <p>{profile.bio}</p>
          <div className="chips">
            {profile.interests.map((interest) => <span className="chip" key={interest}>{interest}</span>)}
          </div>
        </div>
      </article>
      <div className="decisionBar">
        <button className="roundAction secondaryAction" disabled={busy} onClick={() => void rewind()}>↶</button>
        <button className="roundAction secondaryAction" disabled={busy} onClick={() => void decide('pass')}>×</button>
        <button className="roundAction superfuegoAction" disabled={busy} onClick={() => void decide('superfuego')} aria-label="SuperFuego">🔥</button>
        <button className="roundAction primaryAction" disabled={busy} onClick={() => void decide('like')}>♡</button>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </section>
  );
}
