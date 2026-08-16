import type { ModerationDecision } from '@/lib/domain/moderation';
import { preModerateText } from '@/lib/domain/moderation';

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
      explanation: 'Image requires the configured image provider or manual Trust & Safety review.',
      reasons: ['manual_image_review'], humanReviewRequired: true, provider: 'rules',
      modelVersion: 'manual-image-v1', policyVersion: '2026-08-v1',
    };
  }
}

export function getModerationProvider(): ModerationProvider {
  const provider = process.env.MODERATION_PROVIDER ?? 'rules';
  if (provider !== 'rules') console.warn(`Moderation provider ${provider} is not configured; using deterministic rules.`);
  return new RulesModerationProvider();
}
