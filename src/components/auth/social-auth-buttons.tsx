import Link from 'next/link';

export function SocialAuthButtons({mode}:{mode:'register'|'login'}){
  return <div className="socialAuthMethods">
    <Link className="googleAuthButton" href={`/auth/google?mode=${mode}`}>
      <span className="googleMark" aria-hidden="true">G</span>
      <span>{mode==='register'?'Registrarme con Google':'Continuar con Google'}</span>
    </Link>
  </div>;
}
