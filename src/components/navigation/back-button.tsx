'use client';
import { useRouter } from 'next/navigation';

type Props={fallback?:string;label?:string;className?:string};
export function BackButton({fallback='/',label='Volver',className='ghostButton publicBackButton'}:Props){
  const router=useRouter();
  function goBack(){
    if(typeof window!=='undefined'&&window.history.length>1){router.back();return}
    router.push(fallback);
  }
  return <button type="button" className={className} onClick={goBack} aria-label={label}><span aria-hidden="true">←</span> {label}</button>;
}
