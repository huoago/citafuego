import { redirect } from 'next/navigation';
export default async function ChatAlias({params}:{params:Promise<{conversationId:string}>}){const{conversationId}=await params;redirect(`/chats/${conversationId}`)}
