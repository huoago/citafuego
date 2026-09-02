import 'server-only';

export const INTERNAL_ACCOUNT_DOMAIN='accounts.citafuego.invalid';

const reserved=new Set(['admin','administrator','soporte','support','citafuego','moderador','moderator','seguridad','security','root','staff']);
const usernamePattern=/^[a-z0-9][a-z0-9._-]{3,23}$/;
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAccountUsername(value:string){
  return value.trim().toLowerCase();
}

export function isAllowedAccountUsername(value:string){
  const normalized=normalizeAccountUsername(value);
  if(usernamePattern.test(normalized))return !reserved.has(normalized);
  if(normalized.length>254||normalized.endsWith(`@${INTERNAL_ACCOUNT_DOMAIN}`))return false;
  return emailPattern.test(normalized);
}

export function createInternalAccountEmail(){
  return `${crypto.randomUUID()}@${INTERNAL_ACCOUNT_DOMAIN}`;
}

export function isInternalAccountEmail(email:string|undefined|null){
  return Boolean(email?.toLowerCase().endsWith(`@${INTERNAL_ACCOUNT_DOMAIN}`));
}
