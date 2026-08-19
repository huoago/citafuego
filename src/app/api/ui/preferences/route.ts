import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const themes=new Set(['noche','fuego','oceano','bosque','uva']);
const moduleIds=new Set(['completion','social','bio','handle','shortcuts']);
const defaultLayout=[
  {id:'completion',colSpan:2,rowSpan:1,visible:true},
  {id:'social',colSpan:2,rowSpan:1,visible:true},
  {id:'bio',colSpan:2,rowSpan:1,visible:true},
  {id:'handle',colSpan:1,rowSpan:1,visible:true},
  {id:'shortcuts',colSpan:1,rowSpan:2,visible:true},
];

type RawModule={id?:unknown;colSpan?:unknown;rowSpan?:unknown;visible?:unknown};

function normalizeLayout(value:unknown){
  const rows=Array.isArray(value)?value as RawModule[]:[];
  const seen=new Set<string>();
  const result:Array<{id:string;colSpan:1|2;rowSpan:1|2;visible:boolean}>=[];
  for(const row of rows){
    if(typeof row?.id!=='string'||!moduleIds.has(row.id)||seen.has(row.id))continue;
    seen.add(row.id);
    result.push({id:row.id,colSpan:row.colSpan===2?2:1,rowSpan:row.rowSpan===2?2:1,visible:row.visible!==false});
  }
  for(const row of defaultLayout)if(!seen.has(row.id))result.push(row as {id:string;colSpan:1|2;rowSpan:1|2;visible:boolean});
  return result;
}

function responsePayload(data:{theme?:string|null;custom_background?:string|null;module_layout?:unknown}|null|undefined){
  return {
    theme:data?.theme&&themes.has(data.theme)?data.theme:'noche',
    custom_background:data?.custom_background&&/^#[0-9a-fA-F]{6}$/.test(data.custom_background)?data.custom_background:null,
    module_layout:normalizeLayout(data?.module_layout),
  };
}

export async function GET(){
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'not_authenticated'},{status:401});
  const{data,error}=await supabase.from('user_ui_preferences').select('theme,custom_background,module_layout').eq('user_id',user.id).maybeSingle();
  if(error)return NextResponse.json({error:'preferences_unavailable'},{status:503});
  return NextResponse.json(responsePayload(data),{headers:{'cache-control':'no-store'}});
}

export async function PUT(request:Request){
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'not_authenticated'},{status:401});
  let raw:Record<string,unknown>;
  try{raw=await request.json()}catch{return NextResponse.json({error:'invalid_json'},{status:400})}
  const theme=typeof raw.theme==='string'&&themes.has(raw.theme)?raw.theme:null;
  if(!theme)return NextResponse.json({error:'invalid_theme'},{status:400});
  const background=raw.custom_background==null||raw.custom_background===''?null:typeof raw.custom_background==='string'&&/^#[0-9a-fA-F]{6}$/.test(raw.custom_background)?raw.custom_background:null;
  if(raw.custom_background&&background===null)return NextResponse.json({error:'invalid_background'},{status:400});
  const module_layout=normalizeLayout(raw.module_layout);
  const{data,error}=await supabase.from('user_ui_preferences').upsert({user_id:user.id,theme,custom_background:background,module_layout,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('theme,custom_background,module_layout').single();
  if(error)return NextResponse.json({error:'save_failed'},{status:500});
  return NextResponse.json(responsePayload(data));
}
