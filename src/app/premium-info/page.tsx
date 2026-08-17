import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function PremiumInfoPage() {
  return <PublicFeaturePage feature={getPublicFeature('/premium-info')!} />;
}
