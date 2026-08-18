import fs from 'node:fs';

const baseUrl=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY||'';
const projectRef=process.env.SUPABASE_PROJECT_REF||'';
const managementToken=process.env.SUPABASE_ACCESS_TOKEN||'';

if(!baseUrl||!publishableKey){
  console.error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const settingsResponse=await fetch(`${baseUrl}/auth/v1/settings`,{headers:{apikey:publishableKey}});
if(!settingsResponse.ok){
  console.error(`Supabase Auth settings unavailable (${settingsResponse.status})`);
  process.exit(1);
}
const settings=await settingsResponse.json();
const google=settings?.external?.google===true;
const smsProvider=typeof settings?.sms_provider==='string'?settings.sms_provider.trim().toLowerCase():'';
const phone=Boolean(smsProvider&&smsProvider!=='none'&&smsProvider!=='noop');
let smtp='not_verified';
let management='unavailable';

if(managementToken&&projectRef){
  const response=await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`,{
    headers:{Authorization:`Bearer ${managementToken}`},
  });
  if(response.ok){
    management='available';
    const config=await response.json();
    const smtpHost=typeof config?.smtp_host==='string'&&config.smtp_host.trim();
    const smtpUser=typeof config?.smtp_user==='string'&&config.smtp_user.trim();
    const smtpFrom=typeof config?.smtp_admin_email==='string'&&config.smtp_admin_email.trim();
    smtp=smtpHost&&smtpUser&&smtpFrom?'configured':'not_configured';
  }else{
    management=`http_${response.status}`;
  }
}

console.log(`Supabase Auth readiness: google=${google?'enabled':'disabled'}, phone_sms=${phone?'configured':'not_configured'}, custom_smtp=${smtp}, management_audit=${management}`);
const output=process.env.GITHUB_OUTPUT;
if(output){
  fs.appendFileSync(output,`google=${google?'enabled':'disabled'}\n`);
  fs.appendFileSync(output,`phone=${phone?'configured':'not_configured'}\n`);
  fs.appendFileSync(output,`smtp=${smtp}\n`);
  fs.appendFileSync(output,`management=${management}\n`);
}
