'use client';

import { useEffect, useRef, useState } from 'react';
import { preModerateText } from '@/lib/domain/moderation';
import {
  appendDeviceMessage,
  clearDeviceThread,
  loadDeviceThread,
  updateDeviceMessage,
  type DeviceChatMessage,
} from '@/lib/chat/device-store';

type Signal = {
  id: number;
  signal_type: 'offer' | 'answer' | 'ice' | 'hangup';
  payload: Record<string, unknown>;
};

type Envelope = {
  kind: 'chat';
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export function DeviceOnlyChat({
  conversationId,
  userId,
  peerId,
  peerName,
}: {
  conversationId: string;
  userId: string;
  peerId: string;
  peerName: string;
}) {
  const scope = `match:${conversationId}`;
  const caller = userId < peerId;
  const [messages, setMessages] = useState<DeviceChatMessage[]>([]);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [connected, setConnected] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    let active = true;
    void loadDeviceThread(scope).then((rows) => {
      if (active) setMessages(rows);
    });
    return () => {
      active = false;
    };
  }, [scope]);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let lastSignal = 0;
    const pendingIce: RTCIceCandidateInit[] = [];

    async function postSignal(type: Signal['signal_type'], payload: Record<string, unknown>) {
      await fetch('/api/chat/signals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId, type, payload }),
      }).catch(() => undefined);
    }

    async function markSent(message: DeviceChatMessage) {
      const next = await updateDeviceMessage(scope, message.id, { delivery: 'sent' });
      if (!stopped) setMessages(next);
      void fetch('/api/chat/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }).catch(() => undefined);
    }

    async function transmit(message: DeviceChatMessage) {
      const channel = channelRef.current;
      if (!channel || channel.readyState !== 'open') return;
      const envelope: Envelope = {
        kind: 'chat',
        id: message.id,
        senderId: userId,
        body: message.body,
        createdAt: message.createdAt,
      };
      channel.send(JSON.stringify(envelope));
      await markSent(message);
    }

    function bindChannel(channel: RTCDataChannel) {
      channelRef.current = channel;
      channel.onopen = () => {
        setConnected(true);
        setNotice('Conexión privada directa activa.');
        void loadDeviceThread(scope).then(async (rows) => {
          for (const row of rows) {
            if (row.senderId === userId && row.delivery === 'queued') await transmit(row);
          }
        });
      };
      channel.onclose = () => setConnected(false);
      channel.onerror = () => {
        setConnected(false);
        setNotice('La conexión privada se interrumpió. Tus mensajes pendientes siguen solo en este dispositivo.');
      };
      channel.onmessage = (event) => {
        try {
          const envelope = JSON.parse(String(event.data)) as Envelope;
          if (
            envelope.kind !== 'chat' ||
            envelope.senderId !== peerId ||
            typeof envelope.body !== 'string' ||
            envelope.body.length > 2000
          ) return;
          const moderation = preModerateText(envelope.body);
          const body = moderation.action === 'hold' || moderation.action === 'block'
            ? '[Contenido oculto por seguridad local]'
            : envelope.body;
          const incoming: DeviceChatMessage = {
            id: envelope.id,
            senderId: peerId,
            body,
            createdAt: envelope.createdAt,
            delivery: 'received',
          };
          void appendDeviceMessage(scope, incoming).then((rows) => {
            if (!stopped) setMessages(rows);
          });
        } catch {
          // Ignore malformed peer payloads.
        }
      };
    }

    async function setRemote(pc: RTCPeerConnection, description: RTCSessionDescriptionInit) {
      await pc.setRemoteDescription(description);
      while (pendingIce.length) {
        const candidate = pendingIce.shift();
        if (candidate) await pc.addIceCandidate(candidate).catch(() => undefined);
      }
    }

    async function poll() {
      if (stopped) return;
      const response = await fetch(
        `/api/chat/signals?conversationId=${encodeURIComponent(conversationId)}&after=${lastSignal}`,
      ).catch(() => null);
      if (response?.ok) {
        const data = await response.json().catch(() => ({ signals: [] }));
        for (const signal of (data.signals ?? []) as Signal[]) {
          lastSignal = Math.max(lastSignal, Number(signal.id));
          const pc = pcRef.current;
          if (!pc) continue;
          if (signal.signal_type === 'hangup') {
            setConnected(false);
            setNotice(`${peerName} cerró la conexión privada.`);
            continue;
          }
          if (signal.signal_type === 'offer' && !caller) {
            await setRemote(pc, signal.payload as RTCSessionDescriptionInit);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await postSignal('answer', { type: answer.type, sdp: answer.sdp ?? '' });
            continue;
          }
          if (signal.signal_type === 'answer' && caller && !pc.remoteDescription) {
            await setRemote(pc, signal.payload as RTCSessionDescriptionInit);
            continue;
          }
          if (signal.signal_type === 'ice') {
            const candidate = signal.payload as RTCIceCandidateInit;
            if (pc.remoteDescription) await pc.addIceCandidate(candidate).catch(() => undefined);
            else pendingIce.push(candidate);
          }
        }
      }
      if (!stopped) timer = window.setTimeout(() => void poll(), 850);
    }

    async function start() {
      try {
        const iceResponse = await fetch('/api/random/ice');
        const ice = await iceResponse.json();
        const pc = new RTCPeerConnection({ iceServers: ice.iceServers });
        pcRef.current = pc;
        pc.onconnectionstatechange = () => {
          const ready = pc.connectionState === 'connected' && channelRef.current?.readyState === 'open';
          setConnected(ready);
          if (['failed', 'disconnected'].includes(pc.connectionState)) {
            setNotice('Conexión P2P interrumpida. El historial permanece únicamente en este dispositivo.');
          }
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            void postSignal('ice', event.candidate.toJSON() as unknown as Record<string, unknown>);
          }
        };
        pc.ondatachannel = (event) => bindChannel(event.channel);
        if (caller) {
          bindChannel(pc.createDataChannel('citafuego-chat', { ordered: true }));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal('offer', { type: offer.type, sdp: offer.sdp ?? '' });
        }
        void poll();
      } catch {
        setNotice('No pudimos iniciar la conexión privada. Intenta abrir el chat de nuevo.');
      }
    }

    void start();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      channelRef.current?.close();
      pcRef.current?.close();
      void fetch(`/api/chat/signals?conversationId=${encodeURIComponent(conversationId)}`, {
        method: 'DELETE',
      }).catch(() => undefined);
    };
  }, [caller, conversationId, peerId, peerName, scope, userId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    const moderation = preModerateText(value);
    if (moderation.action === 'hold' || moderation.action === 'block') {
      setNotice('Este mensaje fue detenido localmente por las reglas de seguridad y nunca salió de tu dispositivo.');
      return;
    }
    setText('');
    const message: DeviceChatMessage = {
      id: crypto.randomUUID(),
      senderId: userId,
      body: value,
      createdAt: new Date().toISOString(),
      delivery: 'queued',
    };
    let rows = await appendDeviceMessage(scope, message);
    setMessages(rows);
    const channel = channelRef.current;
    if (channel?.readyState === 'open') {
      const envelope: Envelope = {
        kind: 'chat',
        id: message.id,
        senderId: userId,
        body: value,
        createdAt: message.createdAt,
      };
      channel.send(JSON.stringify(envelope));
      rows = await updateDeviceMessage(scope, message.id, { delivery: 'sent' });
      setMessages(rows);
      void fetch('/api/chat/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      }).catch(() => undefined);
      if (moderation.action === 'warn') {
        setNotice('Mensaje enviado. El filtro local detectó una señal de riesgo.');
      }
    } else {
      setNotice('Guardado solo en este dispositivo. Se entregará cuando ambos tengan el chat abierto y la conexión P2P esté activa.');
    }
  }

  async function clearHistory() {
    if (!confirm('¿Borrar el historial cifrado de este dispositivo? No se puede recuperar desde CitaFuego.')) return;
    await clearDeviceThread(scope);
    setMessages([]);
    setNotice('Historial local borrado.');
  }

  return (
    <>
      <div className="softPanel">
        <strong>🔒 Chat solo en tus dispositivos</strong>
        <p>CitaFuego no guarda el contenido. El historial se cifra en este navegador y los mensajes viajan directamente mediante WebRTC. No se sincronizan a otro dispositivo.</p>
        <div className="privacyActions">
          <span className={connected ? 'connectionState online' : 'connectionState'}>
            {connected ? '● P2P conectado' : '○ Esperando conexión P2P'}
          </span>
          <button type="button" className="ghostButton" onClick={() => void clearHistory()}>Borrar historial local</button>
        </div>
      </div>
      <div className="messageList">
        {messages.map((message) => (
          <div key={message.id} className={message.senderId === userId ? 'messageBubble mine' : 'messageBubble'}>
            <p>{message.body}</p>
            {message.senderId === userId ? (
              <small>{message.delivery === 'queued' ? 'Pendiente · solo en este dispositivo' : 'Entregado por conexión directa'}</small>
            ) : null}
          </div>
        ))}
      </div>
      <form className="chatComposer" onSubmit={send}>
        <div className="composerRow">
          <input value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Mensaje privado P2P…" />
          <button className="sendButton" disabled={!text.trim()}>Enviar</button>
        </div>
        {notice ? <small role="status">{notice}</small> : null}
      </form>
    </>
  );
}
