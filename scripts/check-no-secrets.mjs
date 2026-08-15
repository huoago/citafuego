import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const roots=['src','supabase','scripts','docs','.github'];
const forbidden=[/SUPABASE_SECRET_KEY\s*=\s*['\"][^'\"]+/i,/service[_-]?role[^\n]{0,40}['\"][A-Za-z0-9._-]{20,}/i,/ALIYUN_ACCESS_KEY_SECRET\s*=\s*\S+/i,/SMTP_PASSWORD\s*=\s*\S+/i];
async function walk(p){const out=[];for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())out.push(...await walk(f));else out.push(f)}return out}
let bad=[];for(const root of roots){try{for(const f of await walk(root)){const t=await readFile(f,'utf8').catch(()=>null);if(t&&forbidden.some(r=>r.test(t)))bad.push(f)}}catch{}}
if(bad.length){console.error('Potential secret material:',bad);process.exit(1)}
console.log('Secret scan passed');
