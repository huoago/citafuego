'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogCommentView } from '@/lib/blog/server';

export function BlogComments({ postId, enabled, initial }: { postId: string; enabled: boolean; initial: BlogCommentView[] }) {
  const router = useRouter();
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault(); const value = text.trim(); if (!value || busy) return;
    setBusy(true); const response = await fetch(`/api/blog/posts/${postId}/comment`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: value }) });
    const data = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setNotice(data.error === 'content_blocked' ? 'El comentario debe ajustarse a las reglas de seguridad.' : 'No pudimos publicar el comentario.'); return; }
    setText(''); setNotice('Comentario publicado.'); router.refresh();
  }

  async function remove(commentId: string) {
    if (!confirm('¿Eliminar este comentario?')) return;
    const response = await fetch(`/api/blog/comments/${commentId}`, { method: 'DELETE' });
    if (response.ok) setComments((current) => current.filter((comment) => comment.id !== commentId));
  }

  return <section className="blogComments" id="comentarios"><h2>Comentarios <span>{comments.length}</span></h2>
    {enabled ? <form onSubmit={submit} className="commentComposer"><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={1500} rows={3} placeholder="Escribe un comentario…"/><button className="primaryButton" disabled={busy || !text.trim()}>{busy ? 'Publicando…' : 'Comentar'}</button></form> : <div className="softPanel"><p>Los comentarios están desactivados para esta publicación.</p></div>}
    <div className="commentList">{comments.map((comment) => <article key={comment.id}><div><strong>{comment.displayName} {comment.verified ? <span className="verifiedBadge">✓</span> : null}</strong><small>{new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt))}</small></div><p>{comment.body}</p>{comment.canDelete ? <button type="button" className="textDanger" onClick={() => void remove(comment.id)}>Eliminar</button> : null}</article>)}</div>
    {notice ? <div className="onboardingNotice" role="status">{notice}</div> : null}
  </section>;
}
