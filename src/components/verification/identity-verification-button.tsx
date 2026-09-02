'use client';

import {useRouter} from 'next/navigation';

export function IdentityVerificationButton(){
  const router=useRouter();
  return <button className="ctaButton fullWidth" type="button" onClick={()=>router.push('/perfil/verificacion-foto')}>Verificar foto real</button>;
}
