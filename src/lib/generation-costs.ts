export const SUNO_CREDIT_USD = 0.005;

/** Credits charged by SunoAPI.org for each provider operation. */
export const SUNO_PROVIDER_COSTS = {
  music: 12,
  effects: 2.5,
  extend: 12,
  uploadCover: 12,
  uploadExtend: 12,
  addInstrumental: 12,
  addVocals: 12,
  syncedLyrics: 0.5,
  styleBoost: 0.4,
  cover: 0,
  lyrics: 0.4,
  wav: 0.4,
  vocalSeparation: 10,
  advancedSeparation: 20,
  fullSeparation: 50,
  video: 2,
  replaceSection: 5,
  mashup: 12,
  sample: 12,
  voiceProfile: 12,
  customModel: 12,
  persona: 0,
} as const;

/** Credits shown to Loopster users. They are intentionally not SunoAPI credits. */
export const LOOPSTER_COSTS = {
  song: 80,
  instrumental: 80,
  extend: 80,
  uploadCover: 80,
  uploadExtend: 80,
  vocals: 80,
  addInstrumental: 80,
  effects: 17,
  lyrics: 4,
  wav: 3,
  stems: 67,
  advancedStems: 134,
  fullStems: 334,
  video: 14,
  cover: 0,
  replaceSection: 34,
  mashup: 80,
  sample: 80,
  voiceProfile: 80,
  customModel: 160,
  persona: 8,
} as const;

export function sunoCostUsd(providerCredits: number) {
  return Number((providerCredits * SUNO_CREDIT_USD).toFixed(4));
}

export const PROVIDER_COST_BY_JOB_KIND: Record<string, number> = {
  song: SUNO_PROVIDER_COSTS.music,
  instrumental: SUNO_PROVIDER_COSTS.music,
  extend: SUNO_PROVIDER_COSTS.extend,
  "upload-cover": SUNO_PROVIDER_COSTS.uploadCover,
  "upload-extend": SUNO_PROVIDER_COSTS.uploadExtend,
  vocals: SUNO_PROVIDER_COSTS.addVocals,
  "add-instrumental": SUNO_PROVIDER_COSTS.addInstrumental,
  lyrics: SUNO_PROVIDER_COSTS.lyrics,
  wav: SUNO_PROVIDER_COSTS.wav,
  stems: SUNO_PROVIDER_COSTS.vocalSeparation,
  "advanced-stems": SUNO_PROVIDER_COSTS.advancedSeparation,
  "full-stems": SUNO_PROVIDER_COSTS.fullSeparation,
  video: SUNO_PROVIDER_COSTS.video,
  cover: SUNO_PROVIDER_COSTS.cover,
  "replace-section": SUNO_PROVIDER_COSTS.replaceSection,
  mashup: SUNO_PROVIDER_COSTS.mashup,
  sound: SUNO_PROVIDER_COSTS.effects,
  sample: SUNO_PROVIDER_COSTS.sample,
  "voice-profile": SUNO_PROVIDER_COSTS.voiceProfile,
  "custom-model": SUNO_PROVIDER_COSTS.customModel,
  persona: SUNO_PROVIDER_COSTS.persona,
};
