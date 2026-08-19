type TrustMarkProps={
  hasPhoto:boolean;
  verified:boolean;
  identityVerified?:boolean;
  className?:string;
};

export function TrustMark({hasPhoto,verified,identityVerified=false,className=''}:TrustMarkProps){
  if(identityVerified)return <span className={`trustMark trustIdentity ${className}`} title="Identidad verificada" aria-label="Identidad verificada">◆</span>;
  if(hasPhoto&&verified)return <span className={`trustMark trustAdvanced ${className}`} title="Confianza avanzada: fotos aprobadas y verificación completada" aria-label="Confianza avanzada">✦</span>;
  if(verified)return <span className={`trustMark trustVerified ${className}`} title="Perfil verificado" aria-label="Perfil verificado">✓</span>;
  if(hasPhoto)return <span className={`trustMark trustPhoto ${className}`} title="Perfil con fotos aprobadas" aria-label="Perfil con fotos aprobadas">▣</span>;
  return null;
}
