'use client';

export function IdentityVerificationButton(){
  return <button className="ctaButton fullWidth" type="button" onClick={()=>window.location.assign('/perfil/verificacion-foto')}>Verificar foto real</button>;
}
