type TrustMarkProps={
  hasPhoto:boolean;
  verified:boolean;
  /** Legacy compatibility only. Document identity verification is disabled and this value is never rendered. */
  identityVerified?:boolean;
  className?:string;
};

export function TrustMark({hasPhoto,verified,className=''}:TrustMarkProps){
  if(hasPhoto&&verified)return <span className={`trustMark trustAdvanced ${className}`} title="Foto real verificada: selfie privada revisada y foto de perfil aprobada" aria-label="Foto real verificada">✦</span>;
  if(verified)return <span className={`trustMark trustVerified ${className}`} title="Foto real verificada mediante selfie privada" aria-label="Foto real verificada">✓</span>;
  if(hasPhoto)return <span className={`trustMark trustPhoto ${className}`} title="Perfil con fotos aprobadas" aria-label="Perfil con fotos aprobadas">▣</span>;
  return null;
}
