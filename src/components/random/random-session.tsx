'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SafetyActions } from '@/components/safety/safety-actions';
import { preModerateText } from '@/lib/domain/moderation';
import {
  appendDeviceMessage,
  clearDeviceThread,
  loadDeviceThread,
  updateDeviceMessage,
  type DeviceChatMessage,
} from '@/lib/chat/device-store';
import type { RandomMode } from '@/lib/types';

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

export function RandomSession({
  sessionId,
  mode,
  peerId,
  peerName,
  isCaller,
  userId,
}: {
  sessionId: string;
  mode: RandomMode;
  peerId: string;
  peerName: string;
  isCaller: boolean;
  userId: string;
}) {
  const router = useRouter();
  const scope = `random:${sessionId}`;
  const [messages, setMessages] = useState<DeviceChatMessage[]>([]);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    if (mode !== 'text') return;
    let active = true;
    void loadDeviceThread(scope).then((rows) => {
      if (active) setMessages(rows);
    });
    return () => { active = false; };
  }, [mode, scope]);

  useEffect(() => {
    let stopped = false;
    let signalTimer: number | undefined;
    let lastSignal = 0;
    const pendingIce: RTCIceCandidateInit[] = [];

    async function postSignal(type: Signal['signal_type'], payload: Record<string, unknown>) {
      await fetch('/api/random/signals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, type, payload }),
      }).catch(() => undefined);
    }

    async function transmit(message: DeviceChatMessage) {
      const channel = channelRef.current;
      if (!channel || channel.readyState !== 'open') return;
      const envelope: Envelope = { kind: 'chat', id: message.id, senderId: userId, body: message.body, createdAt: message.createdAt };
      channel.send(JSON.stringify(envelope));
      const next = await updateDeviceMessage(scope, message.id, { delivery: 'sent' });
      if (!stopped) setMessages(next);
    }

    function bindDataChannel(channel: RTCDataChannel) {
      channelRef.current = channel;
      channel.onopen = () => {
        setConnected(true);
        setNotice('Canal P2P privado activo.');
        void loadDeviceThread(scope).then(async (rows) => {
          for (const row of rows) if (row.senderId === userId && row.delivery === 'queued') await transmit(row);
        });
      };
      channel.onclose = () => setConnected(false);
      channel.onerror = () => {
        setConnected(false);
        setNotice('El canal privado se interrumpió.');
      };
      channel.onmessage = (event) => {
        try {
          const envelope = JSON.parse(String(event.data)) as Envelope;
          if (envelope.kind !== 'chat' || envelope.senderId !== peerId || typeof envelope.body !== 'string' || envelope.body.length > 2000) return;
          const moderation = preModerateText(envelope.body);
          const body = moderation.action === 'hold' || moderation.action === 'block' ? '[Contenido oculto por seguridad local]' : envelope.body;
          void appendDeviceMessage(scope, { id: envelope.id, senderId: peerId, body, createdAt: envelope.createdAt, delivery: 'received' }).then((rows) => {
            if (!stopped) setMessages(rows);
          });
        } catch {
          // Ignore malformed peer data.
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
      const response = await fetch(`/api/random/signals?sessionId=${encodeURIComponent(sessionId)}&after=${lastSignal}`).catch(() => null);
      if (response?.ok) {
        const data = await response.json().catch(() => ({ signals: [] }));
        for (const signal of (data.signals ?? []) as Signal[]) {
          lastSignal = Math.max(lastSignal, Number(signal.id));
          const pc = pcRef.current;
          if (!pc) continue;
          if (signal.signal_type === 'hangup') {
            setNotice('La otra persona terminó la conexión.');
            setConnected(false);
            pc.close();
            continue;
          }
          if (signal.signal_type === 'offer' && !isCaller) {
            await setRemote(pc, signal.payload as unknown as RTCSessionDescriptionInit);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await postSignal('answer', { type: answer.type, sdp: answer.sdp ?? '' });
            continue;
          }
          if (signal.signal_type === 'answer' && isCaller && !pc.remoteDescription) {
            await setRemote(pc, signal.payload as unknown as RTCSessionDescriptionInit);
            continue;
          }
          if (signal.signal_type === 'ice') {
            const candidate = signal.payload as unknown as RTCIceCandidateInit;
            if (pc.remoteDescription) await pc.addIceCandidate(candidate).catch(() => undefined);
            else pendingIce.push(candidate);
          }
        }
      }
      if (!stopped) signalTimer = window.setTimeout(() => void poll(), 850);
    }

    async function start() {
      try {
        const iceResponse = await fetch('/api/random/ice');
        const ice = await iceResponse.json();
        const pc = new RTCPeerConnection({ iceServers: ice.iceServers });
        pcRef.current = pc;

        if (mode !== 'text') {
          const media = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mode === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          });
          if (stopped) {
            media.getTracks().forEach((track) => track.stop());
            return;
          }
          mediaRef.current = media;
          if (localRef.current) localRef.current.srcObject = media;
          media.getTracks().forEach((track) => pc.addTrack(track, media));
          pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (mode === 'video' && remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
            if (mode === 'voice' && remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
          };
        } else {
          pc.ondatachannel = (event) => bindDataChannel(event.channel);
          if (isCaller) bindDataChannel(pc.createDataChannel('citafuego-random-text', { ordered: true }));
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) void postSignal('ice', event.candidate.toJSON() as unknown as Record<string, unknown>);
        };
        pc.onconnectionstatechange = () => {
          const ready = pc.connectionState === 'connected' && (mode !== 'text' || channelRef.current?.readyState === 'open');
          setConnected(ready);
          if (['failed', 'disconnected'].includes(pc.connectionState)) setNotice('La conexión P2P se interrumpió. Puedes salir y buscar otra persona.');
        };
        if (isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSignal('offer', { type: offer.type, sdp: offer.sdp ?? '' });
        }
        void poll();
      } catch {
        setNotice(mode === 'text' ? 'No pudimos iniciar el canal privado.' : 'No pudimos acceder al micrófono o cámara. Revisa los permisos del navegador.');
      }
    }

    void start();
    return () => {
      stopped = true;
      if (signalTimer) window.clearTimeout(signalTimer);
      channelRef.current?.close();
      pcRef.current?.close();
      mediaRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [isCaller, mode, peerId, scope, sessionId, userId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || mode !== 'text') return;
    const moderation = preModerateText(value);
    if (moderation.action === 'hold' || moderation.action === 'block') {
      setNotice('El mensaje fue detenido por seguridad local y nunca salió de tu dispositivo.');
      return;
    }
    setText('');
    const message: DeviceChatMessage = { id: crypto.randomUUID(), senderId: userId, body: value, createdAt: new Date().toISOString(), delivery: 'queued' };
    let rows = await appendDeviceMessage(scope, message);
    setMessages(rows);
    const channel = channelRef.current;
    if (channel?.readyState === 'open') {
      const envelope: Envelope = { kind: 'chat', id: message.id, senderId: userId, body: value, createdAt: message.createdAt };
      channel.send(JSON.stringify(envelope));
      rows = await updateDeviceMessage(scope, message.id, { delivery: 'sent' });
      setMessages(rows);
    } else {
      setNotice('Mensaje guardado solo en este dispositivo; se enviará cuando el canal P2P esté conectado.');
    }
  }

  function toggleMute() {
    const next = !muted;
    mediaRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    mediaRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  }

  async function clearHistory() {
    if (mode !== 'text' || !confirm('¿Borrar el historial local de esta conversación aleatoria?')) return;
    await clearDeviceThread(scope);
    setMessages([]);
    setNotice('Historial local borrado.');
  }

  async function end() {
    await fetch('/api/random/signals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, type: 'hangup', payload: {} }),
    }).catch(() => undefined);
    await fetch(`/api/random/session/${sessionId}`, { method: 'DELETE' }).catch(() => undefined);
    channelRef.current?.close();
    pcRef.current?.close();
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    router.push('/azar');
    router.refresh();
  }

  return <section className="randomSession"><header className="randomSessionHeader"><div><p className="eyebrow">Conexión aleatoria · {mode === 'text' ? 'Texto' : mode === 'voice' ? 'Voz' : 'Video'}</p><h1>{peerName} <span className="verifiedBadge">✓</span></h1><span className={connected ? 'connectionState online' : 'connectionState'}>{connected ? '● P2P conectado' : '○ Conectando P2P'}</span></div><SafetyActions userId={peerId}/></header>{mode === 'text' ? <><div className="softPanel"><strong>🔒 Sin historial en servidores</strong><p>Los mensajes se cifran en este dispositivo y viajan directamente al otro navegador. CitaFuego no recibe ni almacena el texto.</p></div><div className="randomMessageList">{messages.map((message) => <div key={message.id} className={message.senderId === userId ? 'messageBubble mine' : 'messageBubble'}><p>{message.body}</p>{message.senderId === userId ? <small>{message.delivery === 'queued' ? 'Pendiente local' : 'Entregado P2P'}</small> : null}</div>)}</div><form className="composerRow randomComposer" onSubmit={send}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Mensaje P2P…"/><button className="sendButton" disabled={!text.trim()}>Enviar</button></form><button className="ghostButton" type="button" onClick={() => void clearHistory()}>Borrar historial local</button></> : <div className={`callStage ${mode}`}><video ref={remoteVideoRef} className={mode === 'video' ? 'remoteVideo' : 'hiddenMedia'} autoPlay playsInline/><audio ref={remoteAudioRef} className={mode === 'voice' ? 'remoteAudio' : 'hiddenMedia'} autoPlay controls={mode === 'voice'}/>{mode === 'video' ? <video ref={localRef} className="localVideo" autoPlay playsInline muted/> : null}<div className="callIdentity"><span>{mode === 'voice' ? '◉' : '▣'}</span><strong>{peerName}</strong><small>{connected ? 'Conexión P2P activa' : 'Negociando conexión segura…'}</small></div><div className="callControls"><button type="button" onClick={toggleMute}>{muted ? 'Activar micrófono' : 'Silenciar'}</button>{mode === 'video' ? <button type="button" onClick={toggleCamera}>{cameraOff ? 'Encender cámara' : 'Apagar cámara'}</button> : null}<button type="button" className="hangup" onClick={() => void end()}>Terminar</button></div></div>}{notice ? <div className="onboardingNotice" role="status">{notice}</div> : null}<div className="randomSafetyBar"><button className="ghostButton" type="button" onClick={() => void end()}>Terminar conexión</button><span>Texto, audio y video no se almacenan en CitaFuego. Solo usamos metadatos temporales de señalización para establecer WebRTC.</span></div></section>;
}
