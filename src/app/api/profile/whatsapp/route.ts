import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';

const payloadSchema=z.object({
  number:z.string().max(40).default(''),
  visibility:z.enum(['hidden','public']),
});

function normalizeWhatsAppNumber(value:string){
  const normalized=value.trim().replace(/[\s().-]/g,'');
  if(!normalized)return null;
  return /^\+[1-9][0-9]{7,14}$/.test(normalized)?normalized:null;
}

export async function POST(request:Request){
  const userId=await getAuthenticatedUserId();
  if(!userId)return Response.json({error:'unauthorized'},{status:401});
  let body:unknown;
  try{body=await request.json()}catch{return Response.json({error:'invalid_payload'},{status:400})}
  const parsed=payloadSchema.safeParse(body);
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});

  const raw=parsed.data.number.trim();
  const number=normalizeWhatsAppNumber(raw);
  if(raw&&!number)return Response.json({error:'invalid_phone',message:'Usa formato internacional, por ejemplo +51 999 999 999.'},{status:400});
  if(parsed.data.visibility==='public'&&!number)return Response.json({error:'number_required',message:'Añade un número antes de hacerlo visible.'},{status:400});

  const supabase=await createClient();
  const{data,error}=await supabase.from('user_private')
    .update({whatsapp_e164:number,whatsapp_public:Boolean(number)&&parsed.data.visibility==='public',updated_at:new Date().toISOString()})
    .eq('user_id',userId)
    .select('whatsapp_e164,whatsapp_public')
    .single();
  if(error||!data){
    console.error('whatsapp_profile_save_failed',{code:error?.code??'missing_row'});
    return Response.json({error:'save_failed',message:'No pudimos guardar tu WhatsApp. Inténtalo de nuevo.'},{status:500});
  }
  return Response.json({number:data.whatsapp_e164??null,visibility:data.whatsapp_public?'public':'hidden',saved:true});
}
