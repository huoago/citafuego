'use client';

import { useState } from 'react';
import type { BlogSettingsView } from '@/lib/blog/server';

export function BlogSettingsForm({ initial }: { initial: BlogSettingsView }) {
  const [settings, setSettings] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setNotice('');
    const response = await fetch('/api/blog/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) });
    setBusy(false); setNotice(response.ok ? 'Preferencias del blog guardadas.' : 'No pudimos guardar las preferencias.');
  }
  return <form className="blogSettingsForm" onSubmit={save}>
    <label className="blogField"><span>Privacidad predeterminada</span><select value={settings.defaultVisibility} onChange={(event) => setSettings((current) => ({ ...current, defaultVisibility: event.target.value as BlogSettingsView['defaultVisibility'] }))}><option value="public">Todos en CitaFuego</option><option value="friends">Solo mis Matches</option><option value="selected">Elegir personas al publicar</option><option value="private">Solo yo</option></select></label>
    <div className="blogToggleGrid">
      <label><input type="checkbox" checked={settings.likesEnabled} onChange={(event) => setSettings((current) => ({ ...current, likesEnabled: event.target.checked }))}/> Likes activados por defecto</label>
      <label><input type="checkbox" checked={settings.commentsEnabled} onChange={(event) => setSettings((current) => ({ ...current, commentsEnabled: event.target.checked }))}/> Comentarios activados</label>
      <label><input type="checkbox" checked={settings.sharingEnabled} onChange={(event) => setSettings((current) => ({ ...current, sharingEnabled: event.target.checked }))}/> Compartir activado</label>
      <label><input type="checkbox" checked={settings.watermarkEnabled} onChange={(event) => setSettings((current) => ({ ...current, watermarkEnabled: event.target.checked }))}/> Marca de agua con mi nombre</label>
      <label><input type="checkbox" checked={settings.downloadProtection} onChange={(event) => setSettings((current) => ({ ...current, downloadProtection: event.target.checked }))}/> Protección contra descarga</label>
    </div>
    <div className="softPanel"><strong>Privacidad real, no solo visual</strong><p>La audiencia se valida en el servidor cada vez que alguien abre una publicación. Un enlace compartido no evita los permisos; los bloqueos y cambios de Match también se aplican.</p></div>
    <button className="primaryButton" disabled={busy}>{busy ? 'Guardando…' : 'Guardar preferencias'}</button>{notice ? <div className="onboardingNotice" role="status">{notice}</div> : null}
  </form>;
}
