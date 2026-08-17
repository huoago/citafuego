import { PublicFeaturePage } from '@/components/public/PublicFeaturePage';
import { getPublicFeature } from '@/lib/public-features';

export default function PrivateChatPage() {
  return <PublicFeaturePage feature={getPublicFeature('/chat-privado')!} />;
}
