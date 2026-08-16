'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Liker = {
  profileId: string;
  displayName: string;
  age: number;
  district: string;
  verified: boolean;
  imageUrl: string | null;
};

export function LikesGrid({ initialRows }: { initialRows: Liker[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  async function respond(profileId: string, action: 'like' | 'pass') {
    if (busyId) return;
    setBusyId(profileId);
    const response = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ toUserId: profileId, action }),
    });
    const data = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      setToast('No pudimos guardar tu decisión. Inténtalo de nuevo.');
      return;
    }

    setRows((current) => current.filter((row) => row.profileId !== profileId));
    if (data.matched && data.conversation_id) {
      setToast('🔥 ¡Match! Abriendo el chat…');
      window.setTimeout(() => router.push(`/chats/${data.conversation_id}`), 650);
      return;
    }
    setToast(action === 'like' ? 'Like enviado.' : 'Perfil descartado.');
  }

  if (!rows.length) {
    return <div className="emptyState"><h2>No hay Likes pendientes</h2><p>Cuando alguien nuevo muestre interés aparecerá aquí.</p></div>;
  }

  return (
    <>
      <div className="matchGrid">
        {rows.map((row) => (
          <article className="matchTile" key={row.profileId}>
            {row.imageUrl ? (
              <span className="matchPhoto"><Image src={row.imageUrl} alt={row.displayName} fill sizes="220px" /></span>
            ) : null}
            <strong>{row.displayName}, {row.age} {row.verified ? '✓' : ''}</strong>
            <span>{row.district}</span>
            <div className="tileActions">
              <button className="tileAction secondary" disabled={busyId === row.profileId} onClick={() => void respond(row.profileId, 'pass')} aria-label={`Descartar a ${row.displayName}`}>×</button>
              <button className="tileAction primary" disabled={busyId === row.profileId} onClick={() => void respond(row.profileId, 'like')} aria-label={`Hacer match con ${row.displayName}`}>♡ Match</button>
            </div>
          </article>
        ))}
      </div>
      {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
    </>
  );
}
