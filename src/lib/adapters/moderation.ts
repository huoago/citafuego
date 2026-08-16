import type { ModerationDecision } from '@/lib/domain/moderation';
import { preModerateText } from '@/lib/domain/moderation';
import { MEDIA_POLICY_VERSION } from '@/lib/moderation/media-policy';

export interface TextModerationInput {
  text: string;
  surface: 'bio' | 'prompt' | 'message' | 'blog_post' | 'blog_comment';
  userId: string;
}

export interface ImageModerationInput {
  surface: 'profile_photo' | 'verification_selfie' | 'blog_image';
  userId: string;
  mimeType?: string;
  bytes?: ArrayBuffer;
}

export interface ProfileModerationInput {
  userId: string;
  displayName: string;
  bio: string;
}

export interface ModerationProvider {
  moderateText(input: TextModerationInput): Promise<ModerationDecision>;
  moderateImage(input: ImageModerationInput): Promise<ModerationDecision>;
  moderateProfile(input: ProfileModerationInput): Promise<ModerationDecision>;
}

function holdDecision(explanation: string, provider = 'rules'): ModerationDecision {
  return {
    labels: {}, scores: {}, action: 'hold', recommendedAction: 'hold', explanation,
    reasons: ['manual_image_review'], humanReviewRequired: true, provider,
    modelVersion: provider === 'sightengine' ? 'sightengine-multi-model-v1' : 'manual-image-v3',
    policyVersion: MEDIA_POLICY_VERSION,
  };
}

class RulesModerationProvider implements ModerationProvider {
  async moderateText(input: TextModerationInput) { return preModerateText(input.text); }
  async moderateProfile(input: ProfileModerationInput) { return preModerateText(`${input.displayName}\n${input.bio}`); }
  async moderateImage(): Promise<ModerationDecision> {
    return holdDecision('No automated visual classifier is configured; media is held for Trust & Safety review under the current media policy.');
  }
}

function numberAt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function recursiveMax(value: unknown, depth = 0): number {
  if (depth > 4 || value == null) return 0;
  if (typeof value === 'number') return numberAt(value);
  if (Array.isArray(value)) return value.reduce<number>((max, item) => Math.max(max, recursiveMax(item, depth + 1)), 0);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).reduce<number>((max, item) => Math.max(max, recursiveMax(item, depth + 1)), 0);
  return 0;
}

class SightengineModerationProvider implements ModerationProvider {
  constructor(private readonly apiUser: string, private readonly apiSecret: string) {}
  async moderateText(input: TextModerationInput) { return preModerateText(input.text); }
  async moderateProfile(input: ProfileModerationInput) { return preModerateText(`${input.displayName}\n${input.bio}`); }

  async moderateImage(input: ImageModerationInput): Promise<ModerationDecision> {
    if (!input.bytes?.byteLength) return holdDecision('Visual moderation bytes were unavailable; the upload is held for human review.', 'sightengine');
    const form = new FormData();
    form.set('media', new Blob([input.bytes], { type: input.mimeType || 'image/webp' }), 'citafuego-upload.webp');
    form.set('models', 'nudity-2.1,weapon,offensive-2.0,gore-2.0,self-harm');
    form.set('api_user', this.apiUser);
    form.set('api_secret', this.apiSecret);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form, signal: controller.signal, cache: 'no-store' });
      if (!response.ok) return holdDecision(`Visual moderation provider returned ${response.status}; the upload is held for review.`, 'sightengine');
      const body = await response.json() as Record<string, unknown>;
      if (String(body.status ?? 'success') !== 'success') return holdDecision('Visual moderation provider did not return a successful classification.', 'sightengine');

      const nudity = (body.nudity ?? {}) as Record<string, unknown>;
      const sexualActivity = numberAt(nudity.sexual_activity);
      const sexualDisplay = numberAt(nudity.sexual_display);
      const erotica = numberAt(nudity.erotica);
      const verySuggestive = numberAt(nudity.very_suggestive);
      const suggestive = Math.max(numberAt(nudity.suggestive), numberAt(nudity.visibly_undressed), numberAt(nudity.sextoy));
      const weapon = recursiveMax(body.weapon);
      const offensive = recursiveMax(body.offensive);
      const gore = recursiveMax(body.gore);
      const selfHarm = recursiveMax(body.self_harm ?? body['self-harm']);
      const severe = Math.max(sexualActivity, sexualDisplay, erotica, weapon, gore, selfHarm, offensive);
      const strictSurface = input.surface === 'profile_photo' || input.surface === 'verification_selfie';
      const blockThreshold = strictSurface ? 0.35 : 0.60;
      const reviewThreshold = strictSurface ? 0.25 : 0.40;
      const reasons: string[] = [];
      if (sexualActivity >= reviewThreshold || sexualDisplay >= reviewThreshold || erotica >= reviewThreshold) reasons.push('sexual_content');
      if (verySuggestive >= 0.55 || suggestive >= 0.65) reasons.push('suggestive_content');
      if (weapon >= 0.55) reasons.push('weapon');
      if (gore >= 0.45) reasons.push('gore');
      if (selfHarm >= 0.45) reasons.push('self_harm');
      if (offensive >= 0.65) reasons.push('offensive');

      const mustBlock = severe >= blockThreshold || sexualActivity >= blockThreshold || sexualDisplay >= blockThreshold || erotica >= blockThreshold;
      const mustHold = !mustBlock && (reasons.length > 0 || verySuggestive >= 0.45 || suggestive >= 0.55);
      const action: ModerationDecision['action'] = mustBlock ? 'block' : mustHold ? 'hold' : 'allow';
      const labels: ModerationDecision['labels'] = {};
      const nudityScore = Math.max(sexualActivity, sexualDisplay, erotica, verySuggestive, suggestive);
      const violenceScore = Math.max(weapon, gore, selfHarm, offensive);
      if (nudityScore > 0) labels.nudity_image = nudityScore;
      if (violenceScore > 0) labels.violence_image = violenceScore;
      return {
        labels,
        scores: { sexualActivity, sexualDisplay, erotica, verySuggestive, suggestive, weapon, offensive, gore, selfHarm },
        action,
        recommendedAction: action,
        explanation: action === 'allow' ? 'Automated visual moderation found no policy-level visual risk.' : action === 'block' ? 'Automated visual moderation detected high-confidence policy risk.' : 'Automated visual moderation found borderline content that requires Trust & Safety review.',
        reasons: reasons.length ? reasons : action === 'hold' ? ['manual_image_review'] : [],
        humanReviewRequired: action === 'hold',
        provider: 'sightengine',
        modelVersion: 'nudity-2.1+weapon+offensive-2.0+gore-2.0+self-harm',
        policyVersion: MEDIA_POLICY_VERSION,
      };
    } catch {
      return holdDecision('Visual moderation provider was unavailable; the upload is held for Trust & Safety review.', 'sightengine');
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getModerationProvider(): ModerationProvider {
  const provider = (process.env.MODERATION_PROVIDER ?? 'rules').trim().toLowerCase();
  if (provider === 'sightengine') {
    const apiUser = process.env.SIGHTENGINE_API_USER?.trim() ?? '';
    const apiSecret = process.env.SIGHTENGINE_API_SECRET?.trim() ?? '';
    if (apiUser && apiSecret) return new SightengineModerationProvider(apiUser, apiSecret);
    console.warn('MODERATION_PROVIDER=sightengine but Sightengine credentials are missing; falling back to human review.');
  } else if (provider !== 'rules') {
    console.warn(`Moderation provider ${provider} is not configured; falling back to deterministic rules and human review.`);
  }
  return new RulesModerationProvider();
}
