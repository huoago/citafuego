'use client';

export type DeviceChatDelivery='queued'|'sent'|'received';
export type DeviceChatMessage={id:string;senderId:string;body:string;createdAt:string;delivery:DeviceChatDelivery};

type ThreadRecord={scope:string;iv:ArrayBuffer;cipher:ArrayBuffer;updatedAt:string};
const DB='citafuego-private-chat-v1';
const VERSION=1;
const KEY_ID='device-chat-aes-v1';
const MAX_MESSAGES=500;

function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,VERSION);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('keys'))db.createObjectStore('keys');if(!db.objectStoreNames.contains('threads'))db.createObjectStore('threads',{keyPath:'scope'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
}
function requestValue<T>(request:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function withStore<T>(name:'keys'|'threads',mode:IDBTransactionMode,fn:(store:IDBObjectStore)=>Promise<T>):Promise<T>{const db=await openDb();try{const tx=db.transaction(name,mode);const value=await fn(tx.objectStore(name));await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});return value}finally{db.close()}}
async function getKey():Promise<CryptoKey>{
 const existing=await withStore('keys','readonly',store=>requestValue(store.get(KEY_ID))) as CryptoKey|undefined;
 if(existing)return existing;
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 await withStore('keys','readwrite',async store=>{await requestValue(store.put(key,KEY_ID));return undefined});
 return key;
}
function aad(scope:string){return new TextEncoder().encode(`citafuego:${scope}`)}
export async function loadDeviceThread(scope:string):Promise<DeviceChatMessage[]>{
 if(typeof indexedDB==='undefined')return [];
 const record=await withStore('threads','readonly',store=>requestValue(store.get(scope))) as ThreadRecord|undefined;
 if(!record)return [];
 try{const key=await getKey();const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(record.iv),additionalData:aad(scope)},key,record.cipher);const parsed=JSON.parse(new TextDecoder().decode(clear));return Array.isArray(parsed)?parsed.filter((item):item is DeviceChatMessage=>Boolean(item&&typeof item.id==='string'&&typeof item.senderId==='string'&&typeof item.body==='string'&&typeof item.createdAt==='string')):[]}catch{return []}
}
export async function saveDeviceThread(scope:string,messages:DeviceChatMessage[]):Promise<void>{
 if(typeof indexedDB==='undefined')return;
 const key=await getKey();const iv=crypto.getRandomValues(new Uint8Array(12));const payload=new TextEncoder().encode(JSON.stringify(messages.slice(-MAX_MESSAGES)));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(scope)},key,payload);const record:ThreadRecord={scope,iv:iv.buffer.slice(0),cipher,updatedAt:new Date().toISOString()};
 await withStore('threads','readwrite',async store=>{await requestValue(store.put(record));return undefined});
}
export async function appendDeviceMessage(scope:string,message:DeviceChatMessage):Promise<DeviceChatMessage[]>{const current=await loadDeviceThread(scope);if(current.some(item=>item.id===message.id))return current;const next=[...current,message].slice(-MAX_MESSAGES);await saveDeviceThread(scope,next);return next}
export async function updateDeviceMessage(scope:string,id:string,patch:Partial<Pick<DeviceChatMessage,'delivery'|'body'>>):Promise<DeviceChatMessage[]>{const current=await loadDeviceThread(scope);const next=current.map(item=>item.id===id?{...item,...patch}:item);await saveDeviceThread(scope,next);return next}
export async function clearDeviceThread(scope:string):Promise<void>{if(typeof indexedDB==='undefined')return;await withStore('threads','readwrite',async store=>{await requestValue(store.delete(scope));return undefined})}
