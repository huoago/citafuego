import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function RandomConnectPage() {
  return <PublicFeaturePage feature={getPublicFeature('/random-connect')!} />;
}
