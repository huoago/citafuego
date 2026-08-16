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

class RulesModerationProvider implements ModerationProvider {
  async moderateText(input: TextModerationInput) { return preModerateText(input.text); }
  async moderateProfile(input: ProfileModerationInput) { return preModerateText(`${input.displayName}\n${input.bio}`); }
  async moderateImage(): Promise<ModerationDecision> {
    return {
      labels: {}, scores: {}, action: 'hold', recommendedAction: 'hold',
      explanation: 'No automated visual classifier is configured; media is held for Trust & Safety review under the current media policy.',
      reasons: ['manual_image_review'], humanReviewRequired: true, provider: 'rules',
      modelVersion: 'manual-image-v2', policyVersion: MEDIA_POLICY_VERSION,
    };
  }
}

export function getModerationProvider(): ModerationProvider {
  const provider = process.env.MODERATION_PROVIDER ?? 'rules';
  if (provider !== 'rules') console.warn(`Moderation provider ${provider} is not configured; using deterministic rules.`);
  return new RulesModerationProvider();
}
