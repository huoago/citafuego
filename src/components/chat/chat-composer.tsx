'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const starters = [
  '¿Qué plan te entusiasma esta semana?',
  '¿Cuál es tu lugar favorito de Lima?',
  'Vi tu perfil y me dio curiosidad conocerte mejor 🙂',
];

export function ChatComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId, clientMessageId: crypto.randomUUID(), text }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMsg(data.error === 'message_blocked' ? 'Este mensaje infringe las reglas de seguridad.' : 'No se pudo enviar.');
      return;
    }
    setText('');
    setMsg(data.message?.status === 'held' ? 'Mensaje enviado a revisión; la otra persona aún no lo ve.' : '');
    router.refresh();
  }

  return (
    <form className="chatComposer" onSubmit={send}>
      {!text ? (
        <div className="starterRail" aria-label="Ideas para iniciar la conversación">
          {starters.map((starter) => (
            <button key={starter} className="starterChip" type="button" onClick={() => setText(starter)}>
              {starter}
            </button>
          ))}
        </div>
      ) : null}
      <div className="composerRow">
        <input value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Escribe un mensaje…" aria-label="Mensaje" />
        <button className="sendButton" disabled={busy || !text.trim()} type="submit" aria-label="Enviar mensaje">Enviar</button>
      </div>
      {msg ? <small role="status">{msg}</small> : null}
    </form>
  );
}
