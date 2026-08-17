'use client';

import { useEffect,useRef,useState } from 'react';

type Message={id:string;sender_id:string;body:string|null;status:string;created_at:string};

export function ServerChat({conversationId,userId,peerName,initialMessages}:{conversationId:string;userId:string;peerName:string;initialMessages:Message[]}){
  const[messages,setMessages]=useState(initialMessages);
  const[text,setText]=useState('');
  const[busy,setBusy]=useState(false);
  const[notice,setNotice]=useState('');
  const endRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{endRef.current?.scrollIntoView({block:'end'})},[messages.length]);
  useEffect(()=>{
    let active=true;
    async function refresh(){
      const response=await fetch(`/api/messages?conversationId=${encodeURIComponent(conversationId)}`,{cache:'no-store'}).catch(()=>null);
      if(!active||!response?.ok)return;
      const data=await response.json().catch(()=>({messages:[]}));
      if(active&&Array.isArray(data.messages))setMessages(data.messages as Message[]);
    }
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},2200);
    return()=>{active=false;window.clearInterval(timer)};
  },[conversationId]);

  async function send(event:React.FormEvent){
    event.preventDefault();
    const value=text.trim();
    if(!value||busy)return;
    const clientMessageId=crypto.randomUUID();
    const optimistic:Message={id:clientMessageId,sender_id:userId,body:value,status:'pending',created_at:new Date().toISOString()};
    setText('');setBusy(true);setNotice('');setMessages(current=>[...current,optimistic]);
    const response=await fetch('/api/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({conversationId,text:value,clientMessageId})}).catch(()=>null);
    setBusy(false);
    if(!response){setMessages(current=>current.filter(item=>item.id!==clientMessageId));setText(value);setNotice('No pudimos conectar. Tu mensaje no se perdió: vuelve a intentar.');return}
    const data=await response.json().catch(()=>({}));
    if(!response.ok){setMessages(current=>current.filter(item=>item.id!==clientMessageId));setText(value);setNotice(data.error==='message_rate_limited'?'Estás enviando demasiado rápido. Intenta de nuevo en un momento.':data.error==='conversation_unavailable'?'Esta conversación ya no está disponible.':'No pudimos enviar el mensaje.');return}
    if(data.moderation==='hold')setNotice('El mensaje quedó retenido por seguridad y no se entregó a la otra persona.');
    const refresh=await fetch(`/api/messages?conversationId=${encodeURIComponent(conversationId)}`,{cache:'no-store'}).catch(()=>null);
    if(refresh?.ok){const next=await refresh.json();if(Array.isArray(next.messages))setMessages(next.messages)}
  }

  return <div className="syncedChat">
    <div className="chatPrivacyNote"><span>☁︎</span><div><strong>Chat sincronizado</strong><p>Tus mensajes se entregan aunque {peerName} no tenga el chat abierto y aparecen en tus dispositivos. Puedes bloquear o reportar desde la cabecera.</p></div></div>
    <div className="messageList syncedMessageList" aria-live="polite">
      {messages.length?messages.map(message=><div key={message.id} className={message.sender_id===userId?'messageBubble mine':'messageBubble'}><p>{message.body}</p><small>{message.sender_id===userId?(message.status==='pending'?'Enviando…':message.status==='held'?'Retenido':'Enviado'):new Date(message.created_at).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</small></div>):<div className="chatIcebreaker"><span>🔥</span><strong>Es un Match</strong><p>Empieza con algo que tengan en común, no con un simple “hola”.</p></div>}
      <div ref={endRef}/>
    </div>
    <form className="chatComposer iosChatComposer" onSubmit={send}>
      <div className="composerRow"><input aria-label={`Mensaje para ${peerName}`} value={text} onChange={event=>setText(event.target.value)} maxLength={2000} placeholder={`Mensaje para ${peerName}…`}/><button className="sendButton" disabled={!text.trim()||busy} aria-label="Enviar mensaje">↑</button></div>
      {notice?<small role="status">{notice}</small>:null}
    </form>
  </div>;
}
