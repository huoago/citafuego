import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function PrivateAlbumPage() {
  return <PublicFeaturePage feature={getPublicFeature('/album-privado')!} />;
}
