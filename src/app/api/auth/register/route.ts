import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAdultBirthDate, parseIsoDate } from '@/lib/auth/age';
import { isEmailRegistrationProductionReady } from '@/lib/auth/provider-readiness';
import { getAuthRequestOrigin } from '@/lib/auth/request-origin';
import { verifyTurnstile } from '@/lib/security/turnstile';

const schema=z.object({email:z.string().trim().email().max(254),birthDate:z.string(),acceptedTerms:z.literal(true),acceptedPrivacy:z.literal(true),acceptedSensitive:z.literal(true),turnstileToken:z.string().max(2048).optional()});

export async function POST(request:Request){
 if(!isEmailRegistrationProductionReady())return Response.json({error:'email_registration_unavailable'},{status:503});
 const s=await createClient();
 const{data:enabled}=await s.rpc('public_feature_enabled',{p_key:'EMAIL_REGISTRATION_ENABLED'});
 if(enabled!==true)return Response.json({error:'email_registration_disabled'},{status:503});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success||!parseIsoDate(parsed.data.birthDate))return Response.json({error:'invalid_payload'},{status:400});
 if(!isAdultBirthDate(parsed.data.birthDate))return Response.json({error:'adult_only'},{status:403});
 const challenge=await verifyTurnstile(request,parsed.data.turnstileToken,'register');
 if(!challenge.ok)return Response.json({error:challenge.error??'challenge_failed'},{status:403});
 const{data:docs,error:de}=await s.from('legal_document_versions').select('document_type,current_version').in('document_type',['terms','privacy','sensitive_data']);
 if(de||!docs||docs.length!==3)return Response.json({error:'legal_config_unavailable'},{status:503});
 const versions=Object.fromEntries(docs.map(r=>[r.document_type,r.current_version]));
 const appUrl=getAuthRequestOrigin(request);
 const{error}=await s.auth.signInWithOtp({email:parsed.data.email.toLowerCase(),options:{shouldCreateUser:true,emailRedirectTo:`${appUrl}/auth/confirm?flow=register`,data:{birth_date:parsed.data.birthDate,terms_version:versions.terms,privacy_version:versions.privacy,sensitive_data_version:versions.sensitive_data}}});
 if(error){if(error.status===429)return Response.json({error:'registration_rate_limited'},{status:429});if(error.code==='email_address_not_authorized')return Response.json({error:'email_delivery_unavailable'},{status:503});return Response.json({error:'registration_unavailable'},{status:503});}
 return Response.json({ok:true,delivery:'otp_code',message:'Te enviamos un código de 6 dígitos por correo.',antiBot:challenge.configured});
}
