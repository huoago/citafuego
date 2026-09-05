import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_DIR='supabase/migrations';
const SECURITY_BASELINE='20260905120000';

function stripSqlComments(sql:string){
  return sql
    .replace(/\/\*[\s\S]*?\*\//g,' ')
    .replace(/--[^\n\r]*/g,' ');
}

function privilegedFunctionBlocks(sql:string){
  const clean=stripSqlComments(sql);
  const blocks:{name:string;sql:string}[]=[];
  const start=/create\s+(?:or\s+replace\s+)?function\s+public\.((?:admin_|review_)[a-z0-9_]+)\s*\(/ig;
  let match:RegExpExecArray|null;
  while((match=start.exec(clean))){
    const next=createFunctionEnd(clean,start.lastIndex);
    if(next<0)throw new Error(`Could not parse function block for ${match[1]}`);
    blocks.push({name:match[1],sql:clean.slice(match.index,next)});
    start.lastIndex=next;
  }
  return blocks;
}

function createFunctionEnd(sql:string,from:number){
  const dollar=/\$[A-Za-z0-9_]*\$/g;
  dollar.lastIndex=from;
  const open=dollar.exec(sql);
  if(!open)return -1;
  const token=open[0];
  const close=sql.indexOf(token,open.index+token.length);
  if(close<0)return -1;
  const semicolon=sql.indexOf(';',close+token.length);
  return semicolon<0?close+token.length:semicolon+1;
}

function hasFailClosedGuard(block:string){
  if(!/security\s+definer/i.test(block))return true;
  const adminGuard=/if\s+not\s+public\.admin_has_any_role\s*\([^;]*?\)\s+then\s+raise\s+exception\s+'forbidden'/is;
  const trustGuard=/if\s+not\s+public\.is_trust_admin\s*\([^;]*?\)\s+then\s+raise\s+exception\s+'forbidden'/is;
  return adminGuard.test(block)||trustGuard.test(block);
}

test('future privileged SECURITY DEFINER migrations must fail closed',()=>{
  const files=fs.readdirSync(MIGRATION_DIR)
    .filter(name=>name.endsWith('.sql')&&/^\d{14}_/.test(name))
    .filter(name=>name.slice(0,14)>=SECURITY_BASELINE)
    .sort();

  const violations:string[]=[];
  for(const file of files){
    const sql=fs.readFileSync(path.join(MIGRATION_DIR,file),'utf8');
    for(const block of privilegedFunctionBlocks(sql)){
      if(!hasFailClosedGuard(block.sql))violations.push(`${file}: ${block.name}`);
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Privileged SECURITY DEFINER functions added after the security baseline must use an explicit IF NOT <guard> THEN RAISE EXCEPTION 'forbidden' authorization gate. Violations: ${violations.join(', ')}`
  );
});

test('/explorar stays public while real discovery remains protected',()=>{
  const page=fs.readFileSync('src/app/explorar/page.tsx','utf8');
  const seo=fs.readFileSync('src/lib/seo.ts','utf8');
  assert.doesNotMatch(page,/redirect\('\/descubrir'\)/);
  assert.match(page,/publicMetadata/);
  assert.match(page,/path:'\/explorar'/);
  assert.match(page,/href="\/descubrir"/);
  assert.match(seo,/PUBLIC_INDEXABLE_ROUTES[\s\S]*'\/explorar'/);
  assert.match(seo,/PRIVATE_ROUTE_PREFIXES[\s\S]*'\/descubrir'/);
});

test('admin users blocks destructive actions for auth-only accounts',()=>{
  const page=fs.readFileSync('src/app/admin/users/page.tsx','utf8');
  assert.match(page,/!u\.status\?<div className="adminNotice warn">Cuenta de Auth sin perfil operativo/);
  assert.match(page,/Solo Auth · sin perfil/);
});
