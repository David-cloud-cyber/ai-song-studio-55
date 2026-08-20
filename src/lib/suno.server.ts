/**
 * Server-only client for the sunoapi.org REST API.
 * Docs: https://docs.sunoapi.org
 */
const BASE = "https://api.sunoapi.org/api/v1";

export type SunoModel = "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V4_5ALL" | "V5" | "V5_5";
export type SunoMashupModel = "V4_5" | "V4_5PLUS" | "V4_5ALL" | "V5";

export type SunoClip = {
  id: string;
  audioUrl?: string | null;
  streamAudioUrl?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  prompt?: string | null;
  modelName?: string | null;
  title?: string | null;
  tags?: string | null;
  duration?: number | null;
};

export type SunoTaskInfo = {
  taskId: string;
  status: string;
  errorMessage?: string | null;
  response?: { sunoData?: SunoClip[] } | null;
};

export type SunoStemInfo = {
  taskId: string;
  status: string;
  errorMessage?: string | null;
  response?: {
    originUrl?: string | null;
    instrumentalUrl?: string | null;
    vocalUrl?: string | null;
    backingVocalsUrl?: string | null;
    drumsUrl?: string | null;
    bassUrl?: string | null;
    guitarUrl?: string | null;
    keyboardUrl?: string | null;
    percussionUrl?: string | null;
    stringsUrl?: string | null;
    synthUrl?: string | null;
    fxUrl?: string | null;
    brassUrl?: string | null;
    woodwindsUrl?: string | null;
  } | null;
};

function apiKey() {
  const key = process.env.SUNOAPI_ORG_KEY;
  if (!key) throw new Error("SUNOAPI_ORG_KEY manquant côté serveur.");
  return key;
}

async function sunoRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Le service musical met trop de temps à répondre.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  let json: { code?: number; msg?: string; data?: unknown } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Réponse Suno illisible [${res.status}]: ${text.slice(0, 300)}`);
  }

  if (!res.ok || (json.code !== undefined && json.code !== 200)) {
    const message = json.msg || text.slice(0, 300) || res.statusText;
    console.error(`[suno] ${init.method} ${path} failed [${res.status}/${json.code}]: ${message}`);
    throw new Error(`Suno API [${json.code ?? res.status}]: ${message}`);
  }

  return json.data as T;
}

export function createSong(payload: {
  prompt: string;
  style?: string;
  title?: string;
  customMode: boolean;
  instrumental: boolean;
  model: SunoModel;
  personaId?: string;
  personaModel?: "style_persona" | "voice_persona";
  duration?: number;
  negativeTags?: string;
  vocalGender?: "m" | "f";
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate", { method: "POST", body: payload });
}

export function extendSong(payload: {
  audioId: string;
  defaultParamFlag: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  model: SunoModel;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/extend", { method: "POST", body: payload });
}

export function getTaskInfo(taskId: string) {
  return sunoRequest<SunoTaskInfo>(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
    method: "GET",
  });
}

export function createStemSeparation(payload: {
  taskId: string;
  audioId: string;
  type: "separate_vocal" | "split_stem";
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/vocal-removal/generate", {
    method: "POST",
    body: payload,
  });
}

export function createMashup(payload: {
  uploadUrlList: [string, string];
  prompt?: string;
  style?: string;
  title?: string;
  customMode: boolean;
  model: SunoMashupModel;
  instrumental?: boolean;
  duration?: number;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/mashup", {
    method: "POST",
    body: payload,
  });
}

export function createSound(payload: {
  prompt: string;
  model?: "V5";
  soundLoop?: boolean;
  soundTempo?: number;
  soundKey?: string;
  grabLyrics?: boolean;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/sounds", {
    method: "POST",
    body: payload,
  });
}

export function createVoiceProfile(payload: {
  taskId: string;
  verifyUrl: string;
  voiceName: string;
  description?: string;
  style?: string;
  singerSkillLevel?: "beginner" | "intermediate" | "advanced" | "professional";
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/voice/generate", {
    method: "POST",
    body: payload,
  });
}

export function createVoiceValidation(payload: {
  voiceUrl: string;
  vocalStartS: number;
  vocalEndS: number;
  language: string;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/voice/validate", {
    method: "POST",
    body: payload,
  });
}

export function getVoiceValidationInfo(taskId: string) {
  return sunoRequest<{
    taskId: string;
    status: string;
    validateInfo?: string;
    errorMessage?: string;
  }>(`/voice/validate-info?taskId=${encodeURIComponent(taskId)}`, { method: "GET" });
}

export function getVoiceProfile(voiceId: string) {
  return sunoRequest<{ voiceId: string; status: string; errorMessage?: string }>(
    `/voice/record-info?voiceId=${encodeURIComponent(voiceId)}`,
    { method: "GET" },
  );
}

export function checkVoiceAvailability(taskId: string) {
  return sunoRequest<{ isAvailable: boolean }>("/voice/check-voice", {
    method: "POST",
    body: { task_id: taskId },
  });
}

export function createPersona(payload: {
  taskId: string;
  audioId: string;
  name: string;
  description?: string;
  vocalStart?: number;
  vocalEnd?: number;
  style?: string;
}) {
  return sunoRequest<{ personaId: string }>("/generate/generate-persona", {
    method: "POST",
    body: payload,
  });
}

export function replaceMusicSection(payload: {
  taskId: string;
  audioId: string;
  prompt: string;
  tags?: string;
  title?: string;
  negativeTags?: string;
  infillStartS: number;
  infillEndS: number;
  fullLyrics?: string;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/replace-section", {
    method: "POST",
    body: payload,
  });
}

export function uploadAndCover(payload: {
  uploadUrl: string;
  prompt?: string;
  style?: string;
  title?: string;
  customMode: boolean;
  instrumental: boolean;
  model: SunoModel;
  negativeTags?: string;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/upload-cover", {
    method: "POST",
    body: payload,
  });
}

export function uploadAndExtend(payload: {
  uploadUrl: string;
  defaultParamFlag: boolean;
  model: SunoModel;
  instrumental: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/upload-extend", {
    method: "POST",
    body: payload,
  });
}

export function addVocals(payload: {
  prompt: string;
  title: string;
  uploadUrl: string;
  style: string;
  model: SunoModel;
  negativeTags: string;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/add-vocals", { method: "POST", body: payload });
}

export function addInstrumental(payload: {
  uploadUrl: string;
  title: string;
  tags: string;
  model: SunoModel;
  negativeTags: string;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/generate/add-instrumental", {
    method: "POST",
    body: payload,
  });
}

export function generateLyrics(payload: { prompt: string; callBackUrl: string }) {
  return sunoRequest<{ taskId: string }>("/lyrics", { method: "POST", body: payload });
}

export function convertToWav(payload: { taskId: string; audioId: string; callBackUrl: string }) {
  return sunoRequest<{ taskId: string }>("/wav/generate", { method: "POST", body: payload });
}

export function createMusicVideo(payload: {
  taskId: string;
  audioId: string;
  author: string;
  domainName?: string;
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/mp4/generate", { method: "POST", body: payload });
}

export function createMusicCover(payload: { taskId: string; callBackUrl: string }) {
  return sunoRequest<{ taskId: string }>("/suno/cover/generate", {
    method: "POST",
    body: payload,
  });
}

export function getStemInfo(taskId: string) {
  return sunoRequest<SunoStemInfo>(
    `/vocal-removal/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET" },
  );
}

export function isTerminalFailure(status: string) {
  return /FAIL|ERROR|SENSITIVE/i.test(status);
}
