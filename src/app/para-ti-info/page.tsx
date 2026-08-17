import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function ForYouInfoPage() {
  return <PublicFeaturePage feature={getPublicFeature('/para-ti-info')!} />;
}
