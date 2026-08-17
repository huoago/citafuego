import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function VerificationPage() {
  return <PublicFeaturePage feature={getPublicFeature('/verificacion')!} />;
}
