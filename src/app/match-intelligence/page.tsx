import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function MatchIntelligencePage() {
  return <PublicFeaturePage feature={getPublicFeature('/match-intelligence')!} />;
}
