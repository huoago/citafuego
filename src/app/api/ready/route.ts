import { getAuthProviderReadiness } from '@/lib/auth/provider-readiness';
import { getVercelRequestOidcToken } from '@/lib/auth/account-edge';
import { checkVercelVisualModerationReadiness } from '@/lib/moderation/vercel-ai-visual';

export const dynamic='force-dynamic';

export async function GET(request:Request){
  const [auth,moderation]=await Promise.all([
    getAuthProviderReadiness(),
    checkVercelVisualModerationReadiness(getVercelRequestOidcToken(request)),
  ]);
  const ready=auth.checked===true&&auth.account===true&&moderation.ready===true;
  return Response.json({
    ready,
    service:'citafuego',
    checks:{
      authChecked:auth.checked,
      accountAuth:auth.account,
      emailRegistration:auth.emailRegistration,
      googleAuth:auth.google,
      phoneAuth:auth.phone,
      profilePhotoAutoReview:moderation.ready,
      moderationProvider:moderation.provider,
      moderationModel:moderation.model,
    },
    timestamp:new Date().toISOString(),
  },{status:ready?200:503,headers:{'cache-control':'no-store, max-age=0'}});
}
