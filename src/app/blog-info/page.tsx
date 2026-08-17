import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function BlogInfoPage() {
  return <PublicFeaturePage feature={getPublicFeature('/blog-info')!} />;
}
