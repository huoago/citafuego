import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {requireAdmin} from '@/lib/admin/auth';

const schema=z.object({
  userId:z.string().uuid(),
  type:z.enum(['warning','message_limit','discover_hidden','suspension','ban']),
  reasonCode:z.string().trim().min(2).max(100),
  reasonNote:z.string().trim().max(1000).optional(),
  endsAt:z.string().trim().min(1).max(40).nullable().optional(),
});

function sanctionHoursFromLimaEnd(endsAt:string|null|undefined){
  if(!endsAt)return null;
  // <input type="datetime-local"> has no offset. CitaFuego is Lima-only, so
  // interpret that value as America/Lima (UTC-05:00; Peru does not use DST).
  const hasOffset=/Z$|[+-]\d{2}:\d{2}$/i.test(endsAt);
  const target=new Date(hasOffset?endsAt:`${endsAt}-05:00`);
  if(Number.isNaN(target.getTime()))return undefined;
  const milliseconds=target.getTime()-Date.now();
  if(milliseconds<=0)return undefined;
  const hours=Math.ceil(milliseconds/3_600_000);
  return hours>=1&&hours<=8760?hours:undefined;
}

export async function POST(r:Request){
  if(!await requireAdmin(['super_admin','trust_safety']))return Response.json({error:'forbidden'},{status:403});
  const body=await r.json().catch(()=>null);
  const parsed=schema.safeParse(body);
  if(!parsed.success)return Response.json({error:'invalid_payload'},{status:400});
  const hours=sanctionHoursFromLimaEnd(parsed.data.endsAt);
  if(hours===undefined)return Response.json({error:'invalid_end_time'},{status:400});
  const supabase=await createClient();
  const {data,error}=await supabase.rpc('admin_apply_sanction',{
    p_user:parsed.data.userId,
    p_type:parsed.data.type,
    p_reason_code:parsed.data.reasonCode,
    p_reason_note:parsed.data.reasonNote||null,
    p_hours:hours,
  });
  if(error)return Response.json({error:'sanction_failed'},{status:400});
  return Response.json({ok:true,sanctionId:data});
}
