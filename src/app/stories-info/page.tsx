import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function StoriesInfoPage() {
  return <PublicFeaturePage feature={getPublicFeature('/stories-info')!} />;
}
