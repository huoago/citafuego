'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { BlogAudience, BlogSettingsView } from '@/lib/blog/server';

type Visibility = BlogSettingsView['defaultVisibility'];

export function BlogComposer({ audience, initialSettings }: { audience: BlogAudience[]; initialSettings: BlogSettingsView }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<Visibility>(initialSettings.defaultVisibility);
  const [selected, setSelected] = useState<string[]>([]);
  const [likes, setLikes] = useState(initialSettings.likesEnabled);
  const [comments, setComments] = useState(initialSettings.commentsEnabled);
  const [sharing, setSharing] = useState(initialSettings.sharingEnabled);
  const [watermark, setWatermark] = useState(initialSettings.watermarkEnabled);
  const [downloadProtection, setDownloadProtection] = useState(initialSettings.downloadProtection);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  function chooseFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 8 * 1024 * 1024).slice(0, 6);
    setFiles(next);
  }

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() && files.length === 0) { setNotice('Escribe algo o añade al menos una imagen.'); return; }
    if (visibility === 'selected' && selected.length === 0) { setNotice('Elige al menos un Match para esta publicación.'); return; }
    setBusy(true); setNotice('Preparando publicación…');
    try {
      const create = await fetch('/api/blog/posts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body, visibility, selectedViewerIds: selected, likesEnabled: likes, commentsEnabled: comments, sharingEnabled: sharing, watermarkEnabled: watermark, downloadProtection }),
      });
      const created = await create.json().catch(() => ({}));
      if (!create.ok || !created.postId) { setNotice(created.error === 'content_blocked' ? 'El texto debe ajustarse a las reglas de seguridad antes de publicarse.' : 'No pudimos crear la publicación.'); return; }
      const postId = String(created.postId);
      const supabase = createClient();
      for (let index = 0; index < files.length; index += 1) {
        setNotice(`Procesando imagen ${index + 1} de ${files.length}…`);
        const file = files[index];
        const start = await fetch('/api/blog/media/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId, mimeType: file.type, sizeBytes: file.size, position: index }) });
        const intent = await start.json().catch(() => ({}));
        if (!start.ok) throw new Error('media_start_failed');
        const { error } = await supabase.storage.from('blog-media').uploadToSignedUrl(String(intent.path), String(intent.token), file, { contentType: file.type });
        if (error) throw new Error('media_upload_failed');
        const complete = await fetch('/api/blog/media/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intentId: intent.intentId }) });
        if (!complete.ok) throw new Error('media_complete_failed');
      }
      const finish = await fetch(`/api/blog/posts/${postId}/publish`, { method: 'POST' });
      if (!finish.ok) throw new Error('publish_failed');
      setNotice(files.length ? 'Publicado. Las imágenes que requieran revisión aparecerán cuando sean aprobadas.' : 'Publicado.');
      router.push('/blog/mio'); router.refresh();
    } catch {
      setNotice('La publicación quedó como borrador porque una parte no pudo completarse. Intenta de nuevo.');
    } finally { setBusy(false); }
  }

  return <form className="blogComposer" onSubmit={publish}>
    <label className="blogField"><span>¿Qué quieres compartir?</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={7} placeholder="Una idea, una historia, un momento…"/></label>
    <label className="blogUpload">＋ Añadir fotos <small>Hasta 6 · JPG, PNG o WebP · 8 MB cada una</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(event) => chooseFiles(event.target.files)}/></label>
    {files.length ? <div className="selectedFiles">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div> : null}
    <fieldset className="blogPrivacyBox"><legend>Quién puede verlo</legend>
      <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)} disabled={busy}>
        <option value="public">Todos en CitaFuego</option><option value="friends">Solo mis Matches</option><option value="selected">Elegir personas</option><option value="private">Solo yo</option>
      </select>
      {visibility === 'selected' ? <div className="audiencePicker">{audience.length ? audience.map((person) => <label key={person.id}><input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggleSelected(person.id)}/><span>{person.name} {person.verified ? '✓' : ''}</span></label>) : <p className="muted">Necesitas al menos un Match para usar esta opción.</p>}</div> : null}
    </fieldset>
    <div className="blogToggleGrid">
      <label><input type="checkbox" checked={likes} onChange={(event) => setLikes(event.target.checked)}/> Permitir Likes</label>
      <label><input type="checkbox" checked={comments} onChange={(event) => setComments(event.target.checked)}/> Permitir comentarios</label>
      <label><input type="checkbox" checked={sharing} onChange={(event) => setSharing(event.target.checked)}/> Permitir compartir</label>
      <label><input type="checkbox" checked={watermark} onChange={(event) => setWatermark(event.target.checked)}/> Añadir mi nombre como marca de agua</label>
      <label><input type="checkbox" checked={downloadProtection} onChange={(event) => setDownloadProtection(event.target.checked)}/> Protección contra descarga</label>
    </div>
    <div className="softPanel"><strong>Protección de imágenes</strong><p>Cuando activas la marca de agua, tu nombre se integra dentro del archivo procesado. La protección contra descarga elimina el botón de descarga, bloquea arrastre/clic derecho y usa enlaces privados de corta duración.</p></div>
    <button className="primaryButton" disabled={busy}>{busy ? 'Publicando…' : 'Publicar'}</button>
    {notice ? <div className="onboardingNotice" role="status">{notice}</div> : null}
  </form>;
}
