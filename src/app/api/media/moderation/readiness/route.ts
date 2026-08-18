import { getVercelRequestOidcToken } from '@/lib/auth/account-edge';
import { checkVercelVisualModerationReadiness } from '@/lib/moderation/vercel-ai-visual';

export const dynamic='force-dynamic';

export async function GET(request:Request){
  const token=getVercelRequestOidcToken(request);
  const readiness=await checkVercelVisualModerationReadiness(token);
  return Response.json({checked:true,profilePhotoAutoReview:readiness.ready,...readiness},{status:200,headers:{'cache-control':'no-store'}});
}
