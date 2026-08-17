import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function SwipePage() {
  return <PublicFeaturePage feature={getPublicFeature('/swipe')!} />;
}
