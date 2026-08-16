'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogAudience, BlogPostView } from '@/lib/blog/server';

export function BlogPrivacyEditor({ post, audience }: { post: BlogPostView; audience: BlogAudience[] }) {
  const router = useRouter();
  const [visibility, setVisibility] = useState(post.visibility);
  const [selected, setSelected] = useState(post.selectedViewerIds);
  const [likes, setLikes] = useState(post.likesEnabled);
  const [comments, setComments] = useState(post.commentsEnabled);
  const [sharing, setSharing] = useState(post.sharingEnabled);
  const [downloadProtection, setDownloadProtection] = useState(post.downloadProtection);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (visibility === 'selected' && selected.length === 0) { setNotice('Elige al menos una persona.'); return; }
    setBusy(true);
    const response = await fetch(`/api/blog/posts/${post.postId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ visibility, selectedViewerIds: selected, likesEnabled: likes, commentsEnabled: comments, sharingEnabled: sharing, downloadProtection }) });
    setBusy(false); setNotice(response.ok ? 'Privacidad actualizada.' : 'No pudimos actualizar la publicación.'); if (response.ok) router.refresh();
  }

  async function remove() {
    if (!confirm('¿Eliminar esta publicación? Dejará de ser visible inmediatamente.')) return;
    setBusy(true); const response = await fetch(`/api/blog/posts/${post.postId}`, { method: 'DELETE' }); setBusy(false);
    if (response.ok) { router.push('/blog/mio'); router.refresh(); } else setNotice('No pudimos eliminarla.');
  }

  return <form className="blogPrivacyEditor" onSubmit={save}><h3>Privacidad de esta publicación</h3>
    <select value={visibility} onChange={(event) => setVisibility(event.target.value as BlogPostView['visibility'])}><option value="public">Todos en CitaFuego</option><option value="friends">Solo mis Matches</option><option value="selected">Elegir personas</option><option value="private">Solo yo</option></select>
    {visibility === 'selected' ? <div className="audiencePicker">{audience.map((person) => <label key={person.id}><input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggle(person.id)}/><span>{person.name} {person.verified ? '✓' : ''}</span></label>)}</div> : null}
    <div className="blogToggleGrid"><label><input type="checkbox" checked={likes} onChange={(event) => setLikes(event.target.checked)}/> Likes</label><label><input type="checkbox" checked={comments} onChange={(event) => setComments(event.target.checked)}/> Comentarios</label><label><input type="checkbox" checked={sharing} onChange={(event) => setSharing(event.target.checked)}/> Compartir</label><label><input type="checkbox" checked={downloadProtection} onChange={(event) => setDownloadProtection(event.target.checked)}/> Protección contra descarga</label></div>
    <small className="muted">Marca de agua: {post.watermarkEnabled ? 'activa' : 'desactivada'}. La marca se integra al procesar las imágenes y no se cambia retroactivamente.</small>
    <div className="blogEditorActions"><button className="primaryButton" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><button className="dangerButton" type="button" disabled={busy} onClick={() => void remove()}>Eliminar publicación</button></div>
    {notice ? <div className="onboardingNotice" role="status">{notice}</div> : null}
  </form>;
}
