/**
 * Server-only client for the sunoapi.org REST API.
 * Docs: https://docs.sunoapi.org
 */
const BASE = "https://api.sunoapi.org/api/v1";

export type SunoModel = "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5";

export type SunoClip = {
  id: string;
  audioUrl?: string | null;
  streamAudioUrl?: string | null;
  imageUrl?: string | null;
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
  const res = await fetch(`${BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

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
  type: "separate_vocal";
  callBackUrl: string;
}) {
  return sunoRequest<{ taskId: string }>("/vocal-removal/generate", {
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
