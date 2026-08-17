import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { isPremiumEnabled } from '@/lib/features/premium';

export default function PremiumLayout({children}:{children:ReactNode}){
  if(!isPremiumEnabled())redirect('/perfil');
  return children;
}
