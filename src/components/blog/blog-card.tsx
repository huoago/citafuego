'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProtectedBlogImage } from './protected-blog-image';
import type { BlogPostView } from '@/lib/blog/server';

const audienceLabel: Record<BlogPostView['visibility'], string> = {
  public: 'Todos en CitaFuego',
  friends: 'Solo Matches',
  selected: 'Personas elegidas',
  private: 'Solo yo',
};

export function BlogCard({ post, currentUserId, detail = false }: { post: BlogPostView; currentUserId: string; detail?: boolean }) {
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likes, setLikes] = useState(post.likeCount);
  const [shares, setShares] = useState(post.shareCount);
  const [busy, setBusy] = useState(false);
  const mine = post.authorId === currentUserId;

  async function toggleLike() {
    if (busy || mine || !post.likesEnabled) return;
    setBusy(true);
    const response = await fetch(`/api/blog/posts/${post.postId}/like`, { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (response.ok) { setLiked(Boolean(data.liked)); setLikes(Number(data.count ?? likes)); }
  }

  async function sharePost() {
    if (busy || !post.sharingEnabled) return;
    setBusy(true);
    const response = await fetch(`/api/blog/posts/${post.postId}/share`, { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return;
    setShares(Number(data.count ?? shares));
    const url = `${window.location.origin}/blog/${post.postId}`;
    try {
      if (navigator.share) await navigator.share({ title: `${post.authorName} · CitaFuego`, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* User cancelled native share. */ }
  }

  const time = post.publishedAt ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(post.publishedAt)) : '';
  return <article className={`blogCard${detail ? ' detail' : ''}`}>
    <header className="blogCardHeader">
      <div><Link href={mine ? '/blog/mio' : `/blog/usuario/${post.authorId}`} className="blogAuthor">{post.authorName} {post.authorVerified ? <span className="verifiedBadge">✓</span> : null}</Link><div className="blogMeta"><span>{time}</span><span>·</span><span>{audienceLabel[post.visibility]}</span></div></div>
      <div className="blogBadges">{post.watermarkEnabled && post.media.length ? <span>© Marca de agua</span> : null}{post.downloadProtection && post.media.length ? <span>🔒 Protegido</span> : null}</div>
    </header>
    {post.body ? <p className="blogBody">{post.body}</p> : null}
    {post.media.length ? <div className={`blogMediaGrid mediaCount${Math.min(post.media.length, 4)}`}>{post.media.map((media, index) => media.url ? <ProtectedBlogImage key={media.id} src={media.url} alt={`Publicación de ${post.authorName}, imagen ${index + 1}`} protectedMode={post.downloadProtection}/> : <div className="blogMediaPending" key={media.id}>{media.status === 'pending' ? 'Imagen en revisión' : 'Imagen no disponible'}</div>)}</div> : null}
    <footer className="blogActions">
      <button type="button" disabled={busy || mine || !post.likesEnabled} className={liked ? 'active' : ''} onClick={() => void toggleLike()}>♥ {likes}</button>
      {post.commentsEnabled ? <Link href={`/blog/${post.postId}#comentarios`}>💬 {post.commentCount}</Link> : <span>💬 Desactivados</span>}
      <button type="button" disabled={busy || !post.sharingEnabled} onClick={() => void sharePost()}>↗ {shares}</button>
      {!detail ? <Link href={`/blog/${post.postId}`}>Ver publicación</Link> : null}
    </footer>
  </article>;
}
