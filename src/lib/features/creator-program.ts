import 'server-only';

/**
 * Global launch gate for user-facing Creator monetization.
 * Closed by default so unfinished commercial flows cannot be exposed accidentally.
 * Re-opening requires CREATOR_PROGRAM_ENABLED=true in the production environment
 * and a fresh deployment after the operational checklist is approved.
 */
export function isCreatorProgramEnabled() {
  return process.env.CREATOR_PROGRAM_ENABLED === 'true';
}

export const CREATOR_PROGRAM_CLOSED_ERROR = 'creator_program_temporarily_closed';

export function creatorProgramClosedResponse() {
  return Response.json({ error: CREATOR_PROGRAM_CLOSED_ERROR }, { status: 503 });
}
