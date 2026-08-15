import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAdultBirthDate, parseIsoDate } from '@/lib/auth/age';
const schema=z.object({email:z.string().email().max(254),birthDate:z.string(),acceptedTerms:z.literal(true),acceptedPrivacy:z.literal(true),acceptedSensitive:z.literal(true)});
export async function POST(request:Request){
 const parsed=schema.safeParse(await request.json()); if(!parsed.success||!parseIsoDate(parsed.data.birthDate))return Response.json({error:'invalid_payload'},{status:400});
 if(!isAdultBirthDate(parsed.data.birthDate))return Response.json({error:'adult_only'},{status:403});
 const s=await createClient(); const{data:docs,error:de}=await s.from('legal_document_versions').select('document_type,current_version').in('document_type',['terms','privacy','sensitive_data']);
 if(de||!docs||docs.length!==3)return Response.json({error:'legal_config_unavailable'},{status:503}); const versions=Object.fromEntries(docs.map(r=>[r.document_type,r.current_version]));
 const appUrl=process.env.NEXT_PUBLIC_APP_URL??new URL(request.url).origin;
 const{error}=await s.auth.signInWithOtp({email:parsed.data.email.toLowerCase(),options:{shouldCreateUser:true,emailRedirectTo:`${appUrl}/auth/confirm`,data:{birth_date:parsed.data.birthDate,terms_version:versions.terms,privacy_version:versions.privacy,sensitive_data_version:versions.sensitive_data}}});
 if(error)return Response.json({error:'registration_unavailable'},{status:429}); return Response.json({ok:true,message:'Revisa tu correo. Te enviamos un enlace seguro para continuar.'});
}
