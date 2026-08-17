import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ServerChat } from '@/components/chat/server-chat';
import { SafetyActions } from '@/components/safety/safety-actions';
import { getAuthenticatedUserId } from '@/lib/auth/server';

export const dynamic='force-dynamic';

type StoredMessage={id:string;sender_id:string;body:string|null;status:string;created_at:string};

export default async function Page({params}:{params:Promise<{conversationId:string}>}){
  const{conversationId}=await params;
  const userId=await getAuthenticatedUserId();
  if(!userId)notFound();
  const s=await createClient();
  const[{data:h},{data:messages}]=await Promise.all([
    s.rpc('get_conversation_header',{p_conversation:conversationId}),
    s.from('messages').select('id,sender_id,body,status,created_at').eq('conversation_id',conversationId).is('deleted_at',null).order('created_at',{ascending:true}).limit(100),
  ]);
  const header=(h as Array<{other_profile_id:string;display_name:string;district:string|null;verified:boolean;primary_photo_path:string|null}>|null)?.[0];
  if(!header)notFound();
  let photoUrl:string|null=null;
  if(header.primary_photo_path){const{data}=await s.storage.from('profile-photos').createSignedUrl(header.primary_photo_path,600);photoUrl=data?.signedUrl??null}
  return <section className="conversationPage">
    <header className="conversationHeader iosConversationHeader">
      {photoUrl?<span className="chatPhoto"><Image src={photoUrl} alt={header.display_name} fill sizes="56px"/></span>:<span className="avatarPlaceholder small">{header.display_name.slice(0,1)}</span>}
      <div><h1>{header.display_name} {header.verified?'✓':''}</h1><span>{header.district??'Lima'} · Match activo</span></div>
      <SafetyActions userId={header.other_profile_id} conversationId={conversationId}/>
    </header>
    <ServerChat conversationId={conversationId} userId={userId} peerId={header.other_profile_id} peerName={header.display_name} initialMessages={(messages??[]) as StoredMessage[]}/>
  </section>;
}
