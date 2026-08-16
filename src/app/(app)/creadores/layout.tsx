import type { ReactNode } from 'react';
import { CreatorProgramClosed } from '@/components/creators/creator-program-closed';
import { isCreatorProgramEnabled } from '@/lib/features/creator-program';

export default function CreatorLayout({ children }: { children: ReactNode }) {
  if (!isCreatorProgramEnabled()) return <CreatorProgramClosed />;
  return children;
}
