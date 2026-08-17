import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function SafetyPrivacyPage() {
  return <PublicFeaturePage feature={getPublicFeature('/seguridad-privacidad')!} />;
}
