import Link from 'next/link';

export function SocialAuthButtons({mode,nextPath}:{mode:'register'|'login';nextPath?:'/admin'}){
  const params=new URLSearchParams({mode});
  if(mode==='login'&&nextPath==='/admin')params.set('next','/admin');
  return <div className="socialAuthMethods">
    <Link className="googleAuthButton" href={`/auth/google?${params.toString()}`}>
      <span className="googleMark" aria-hidden="true">G</span>
      <span>{mode==='register'?'Registrarme con Google':'Continuar con Google'}</span>
    </Link>
  </div>;
}
