'use client';

export function ProtectedBlogImage({ src, alt, protectedMode = true }: { src: string; alt: string; protectedMode?: boolean }) {
  return <div className={`blogMediaFrame${protectedMode ? ' protected' : ''}`} onContextMenu={protectedMode ? (event) => event.preventDefault() : undefined}>
    {/* Blog media deliberately bypasses Next/Image so short-lived signed URLs are not turned into a long-lived optimizer cache. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} draggable={!protectedMode} referrerPolicy="no-referrer" onDragStart={protectedMode ? (event) => event.preventDefault() : undefined}/>
    {protectedMode ? <span className="downloadShield" aria-label="Descarga protegida">🔒</span> : <a className="blogDownloadLink" href={src} target="_blank" rel="noreferrer">Abrir imagen</a>}
  </div>;
}
