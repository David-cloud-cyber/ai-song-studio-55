export type ProjectStatus = "ready" | "rendering" | "draft";
export type ProjectKind = "song" | "clip" | "instrumental" | "lyrics" | "cover" | "visualizer";

export interface Project {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  duration: string;
  kind: ProjectKind;
  status: ProjectStatus;
  coverGradient: string;
  waveform: number[];
  author: string;
  createdAt: string;
  progress?: number;
}

const pseudoRandom = (x: number) => {
  const sin = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
  return sin - Math.floor(sin);
};

const wave = (seed: number, len = 48) =>
  Array.from({ length: len }, (_, i) =>
    Math.max(0.15, Math.abs(Math.sin(seed + i * 0.7)) * 0.75 + pseudoRandom(seed * 100 + i) * 0.25),
  );

export const projects: Project[] = [
  {
    id: "neon-drift",
    title: "Neon Drift",
    genre: "Synthwave",
    bpm: 124,
    duration: "3:45",
    kind: "song",
    status: "ready",
    coverGradient: "from-cyan-400 via-blue-600 to-fuchsia-700",
    waveform: wave(1),
    author: "You",
    createdAt: "il y a 2h",
  },
  {
    id: "chrome-echoes",
    title: "Chrome Echoes",
    genre: "Techno",
    bpm: 138,
    duration: "4:12",
    kind: "instrumental",
    status: "ready",
    coverGradient: "from-zinc-400 via-slate-500 to-zinc-800",
    waveform: wave(2),
    author: "You",
    createdAt: "hier",
  },
  {
    id: "midnight-whispers",
    title: "Midnight Whispers",
    genre: "Vocal Pop",
    bpm: 92,
    duration: "2:58",
    kind: "song",
    status: "rendering",
    coverGradient: "from-amber-400 via-rose-500 to-indigo-700",
    waveform: wave(3),
    author: "You",
    createdAt: "il y a 5 min",
    progress: 62,
  },
  {
    id: "phonk-cathedral",
    title: "Phonk Cathedral",
    genre: "Phonk",
    bpm: 140,
    duration: "3:20",
    kind: "clip",
    status: "ready",
    coverGradient: "from-red-500 via-orange-600 to-black",
    waveform: wave(4),
    author: "You",
    createdAt: "il y a 3j",
  },
  {
    id: "aurora-choir",
    title: "Aurora Choir",
    genre: "Ambient",
    bpm: 76,
    duration: "5:14",
    kind: "visualizer",
    status: "ready",
    coverGradient: "from-emerald-400 via-teal-500 to-purple-700",
    waveform: wave(5),
    author: "You",
    createdAt: "il y a 4j",
  },
  {
    id: "808-manifesto",
    title: "808 Manifesto",
    genre: "Trap",
    bpm: 148,
    duration: "2:44",
    kind: "instrumental",
    status: "draft",
    coverGradient: "from-fuchsia-500 via-purple-700 to-cyan-500",
    waveform: wave(6),
    author: "You",
    createdAt: "il y a 6j",
  },
  {
    id: "velvet-ballad",
    title: "Velvet Ballad",
    genre: "R&B",
    bpm: 84,
    duration: "3:30",
    kind: "song",
    status: "ready",
    coverGradient: "from-rose-400 via-red-600 to-slate-900",
    waveform: wave(7),
    author: "Naomi",
    createdAt: "il y a 1 sem",
  },
  {
    id: "glacier-ost",
    title: "Glacier OST",
    genre: "Cinematic",
    bpm: 60,
    duration: "6:02",
    kind: "instrumental",
    status: "ready",
    coverGradient: "from-sky-300 via-blue-500 to-indigo-900",
    waveform: wave(8),
    author: "You",
    createdAt: "il y a 2 sem",
  },
];

export interface Template {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  kind: ProjectKind;
  color: string;
}

export const templates: Template[] = [
  {
    id: "clip",
    code: "MV",
    title: "Clip Vidéo",
    subtitle: "Clip vidéo IA",
    kind: "clip",
    color: "neon",
  },
  {
    id: "song",
    code: "SN",
    title: "Morceau complet",
    subtitle: "Vocals + Instru",
    kind: "song",
    color: "zinc",
  },
  {
    id: "instru",
    code: "IN",
    title: "Instrumental",
    subtitle: "Synthèse musicale",
    kind: "instrumental",
    color: "zinc",
  },
  {
    id: "lyrics",
    code: "LY",
    title: "Paroles",
    subtitle: "Générateur de paroles",
    kind: "lyrics",
    color: "zinc",
  },
  {
    id: "cover",
    code: "CV",
    title: "Pochette",
    subtitle: "Pochette d'album",
    kind: "cover",
    color: "zinc",
  },
  {
    id: "vis",
    code: "VZ",
    title: "Visualiseur",
    subtitle: "Effets réactifs",
    kind: "visualizer",
    color: "zinc",
  },
];

export interface Collaborator {
  id: string;
  name: string;
  handle: string;
  color: string;
}

export const collaborators: Collaborator[] = [
  { id: "1", name: "Naomi K.", handle: "@naomi", color: "from-rose-400 to-fuchsia-600" },
  { id: "2", name: "Ilyas B.", handle: "@ilyz", color: "from-cyan-400 to-blue-600" },
  { id: "3", name: "Sora M.", handle: "@sora", color: "from-emerald-400 to-teal-600" },
  { id: "4", name: "Jae L.", handle: "@jae", color: "from-amber-400 to-orange-600" },
];

export const feedItems: (Project & {
  likes: number;
  remixes: number;
  authorHandle: string;
  authorColor: string;
})[] = [
  {
    ...projects[3],
    id: "feed-1",
    author: "Ilyas B.",
    authorHandle: "@ilyz",
    authorColor: "from-cyan-400 to-blue-600",
    likes: 1284,
    remixes: 42,
  },
  {
    ...projects[6],
    id: "feed-2",
    authorHandle: "@naomi",
    authorColor: "from-rose-400 to-fuchsia-600",
    likes: 8421,
    remixes: 218,
  },
  {
    ...projects[4],
    id: "feed-3",
    author: "Sora M.",
    authorHandle: "@sora",
    authorColor: "from-emerald-400 to-teal-600",
    likes: 512,
    remixes: 12,
  },
  {
    ...projects[7],
    id: "feed-4",
    author: "Jae L.",
    authorHandle: "@jae",
    authorColor: "from-amber-400 to-orange-600",
    likes: 3320,
    remixes: 88,
  },
];

export const genres = [
  "Phonk",
  "Synthwave",
  "Trap",
  "Lo-fi",
  "Techno",
  "R&B",
  "Cinematic",
  "Pop",
  "Ambient",
  "Drill",
];
export const moods = [
  "Agressif",
  "Mélancolique",
  "Épique",
  "Chill",
  "Rêveur",
  "Sombre",
  "Solaire",
  "Nostalgique",
];
export const voices = [
  "Voix masculine",
  "Voix féminine",
  "Chœur",
  "Instrumental",
  "Auto-tune",
  "Rap",
];

export const creditUsage = [
  {
    id: "u1",
    label: "Neon Drift — Morceau complet",
    when: "Aujourd'hui, 14:22",
    cost: 80,
    kind: "song",
  },
  { id: "u2", label: "Phonk Cathedral — Clip vidéo", when: "Hier, 21:08", cost: 14, kind: "clip" },
  { id: "u3", label: "Aurora Choir — Visualizer", when: "il y a 2j", cost: 67, kind: "visualizer" },
  { id: "u4", label: "808 Manifesto — Pochette", when: "il y a 3j", cost: 0, kind: "cover" },
  { id: "u5", label: "Velvet Ballad — Paroles", when: "il y a 5j", cost: 4, kind: "lyrics" },
];

export const plans = [
  {
    id: "free",
    name: "Gratuit",
    price: "Gratuit",
    period: "",
    credits: 80,
    features: ["80 crédits renouvelés chaque jour", "Créations standard", "Écoute dans la bibliothèque", "Export réservé aux abonnés"],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "5 900 XAF",
    period: "/30 jours",
    credits: 2500,
    features: ["2 500 crédits par période", "Export MP3 et WAV", "Droits commerciaux inclus", "File prioritaire"],
    current: false,
    highlight: true,
  },
  {
    id: "premier",
    name: "Premier",
    price: "15 900 XAF",
    period: "/30 jours",
    credits: 10000,
    features: [
      "10 000 crédits par période",
      "Tous les exports audio et vidéo",
      "Tous les outils de séparation",
      "Création en parallèle",
    ],
    current: false,
  },
];

export const user = {
  name: "Jordan Doe",
  handle: "@jordan",
  initials: "JD",
  credits: 80,
  plan: "Studio Free",
  color: "from-cyan-400 to-fuchsia-600",
};

export interface CreditPack {
  id: string;
  credits: number;
  price: string;
  bonus?: string;
  highlight?: boolean;
}

export const creditPacks: CreditPack[] = [
  { id: "p1", credits: 200, price: "1 500 XAF" },
  { id: "p2", credits: 550, price: "3 500 XAF", bonus: "+50 offerts", highlight: true },
  { id: "p3", credits: 1400, price: "7 000 XAF", bonus: "+200 offerts" },
  { id: "p4", credits: 3700, price: "14 000 XAF", bonus: "+700 offerts" },
];

export interface ChatMessage {
  id: string;
  author: string;
  handle: string;
  color: string;
  time: string;
  text: string;
  own?: boolean;
}

export const sessionChat: ChatMessage[] = [
  {
    id: "m1",
    author: "Naomi K.",
    handle: "@naomi",
    color: "from-rose-400 to-fuchsia-600",
    time: "14:02",
    text: "J'ai posé une nouvelle prise sur le refrain 🎤",
  },
  {
    id: "m2",
    author: "Ilyas B.",
    handle: "@ilyz",
    color: "from-cyan-400 to-blue-600",
    time: "14:03",
    text: "Fire. On monte le side-chain sur le kick ?",
  },
  {
    id: "m3",
    author: "You",
    handle: "@jordan",
    color: "from-cyan-400 to-fuchsia-600",
    time: "14:05",
    text: "Je pousse un rendu 2K pour voir",
    own: true,
  },
  {
    id: "m4",
    author: "Sora M.",
    handle: "@sora",
    color: "from-emerald-400 to-teal-600",
    time: "14:07",
    text: "Le drop est parfait, on garde la version B",
  },
  {
    id: "m5",
    author: "Naomi K.",
    handle: "@naomi",
    color: "from-rose-400 to-fuchsia-600",
    time: "14:09",
    text: "J'écris la 2e strophe, deux minutes",
  },
];

export interface SessionMember {
  id: string;
  name: string;
  handle: string;
  role: string;
  color: string;
  status: "recording" | "listening" | "idle" | "editing";
  activity: string;
}

export const sessionMembers: SessionMember[] = [
  {
    id: "s1",
    name: "Naomi K.",
    handle: "@naomi",
    role: "Topline",
    color: "from-rose-400 to-fuchsia-600",
    status: "recording",
    activity: "Enregistre les vocals",
  },
  {
    id: "s2",
    name: "Ilyas B.",
    handle: "@ilyz",
    role: "Beatmaker",
    color: "from-cyan-400 to-blue-600",
    status: "editing",
    activity: "Ajuste le mix drums",
  },
  {
    id: "s3",
    name: "Sora M.",
    handle: "@sora",
    role: "Sound Design",
    color: "from-emerald-400 to-teal-600",
    status: "listening",
    activity: "Écoute la version B",
  },
  {
    id: "s4",
    name: "You",
    handle: "@jordan",
    role: "Producer",
    color: "from-cyan-400 to-fuchsia-600",
    status: "editing",
    activity: "Prépare l'export",
  },
  {
    id: "s5",
    name: "Jae L.",
    handle: "@jae",
    role: "Visuals",
    color: "from-amber-400 to-orange-600",
    status: "idle",
    activity: "En pause",
  },
];

export interface Stem {
  id: string;
  label: string;
  color: string;
  volume: number;
  pan: number;
  muted?: boolean;
  solo?: boolean;
  peaks: number[];
}

export const stems: Stem[] = [
  {
    id: "drums",
    label: "Drums",
    color: "from-rose-500 to-orange-500",
    volume: 78,
    pan: 0,
    peaks: wave(11, 32),
  },
  {
    id: "bass",
    label: "Bass",
    color: "from-fuchsia-500 to-purple-600",
    volume: 65,
    pan: -8,
    peaks: wave(12, 32),
  },
  {
    id: "synths",
    label: "Synths",
    color: "from-cyan-400 to-blue-500",
    volume: 72,
    pan: 12,
    peaks: wave(13, 32),
  },
  {
    id: "vocals",
    label: "Vocals",
    color: "from-emerald-400 to-teal-500",
    volume: 84,
    pan: 0,
    peaks: wave(14, 32),
  },
  {
    id: "fx",
    label: "FX",
    color: "from-amber-400 to-yellow-500",
    volume: 42,
    pan: -18,
    peaks: wave(15, 32),
  },
];

export interface TimelineClip {
  id: string;
  track: string;
  label: string;
  start: number; // %
  width: number; // %
  color: string;
}

export const timelineClips: TimelineClip[] = [
  {
    id: "c1",
    track: "drums",
    label: "Kick loop",
    start: 0,
    width: 22,
    color: "from-rose-500 to-orange-500",
  },
  {
    id: "c2",
    track: "drums",
    label: "Break",
    start: 24,
    width: 16,
    color: "from-rose-500 to-orange-500",
  },
  {
    id: "c3",
    track: "drums",
    label: "Kick loop",
    start: 42,
    width: 32,
    color: "from-rose-500 to-orange-500",
  },
  {
    id: "c4",
    track: "drums",
    label: "Outro",
    start: 76,
    width: 20,
    color: "from-rose-500 to-orange-500",
  },
  {
    id: "c5",
    track: "bass",
    label: "808 line",
    start: 8,
    width: 60,
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "c6",
    track: "bass",
    label: "Sub",
    start: 70,
    width: 24,
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "c7",
    track: "synths",
    label: "Pads",
    start: 0,
    width: 40,
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "c8",
    track: "synths",
    label: "Lead",
    start: 44,
    width: 30,
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "c9",
    track: "synths",
    label: "Arp",
    start: 76,
    width: 22,
    color: "from-cyan-400 to-blue-500",
  },
  {
    id: "c10",
    track: "vocals",
    label: "Verse 1",
    start: 12,
    width: 22,
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "c11",
    track: "vocals",
    label: "Hook",
    start: 38,
    width: 20,
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "c12",
    track: "vocals",
    label: "Verse 2",
    start: 62,
    width: 22,
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "c13",
    track: "fx",
    label: "Riser",
    start: 34,
    width: 6,
    color: "from-amber-400 to-yellow-500",
  },
  {
    id: "c14",
    track: "fx",
    label: "Impact",
    start: 58,
    width: 4,
    color: "from-amber-400 to-yellow-500",
  },
];

export interface OnboardingStyle {
  id: string;
  label: string;
  emoji: string;
  gradient: string;
}

export const onboardingStyles: OnboardingStyle[] = [
  { id: "phonk", label: "Phonk", emoji: "🔥", gradient: "from-red-500 to-orange-600" },
  { id: "synthwave", label: "Synthwave", emoji: "🌌", gradient: "from-cyan-400 to-fuchsia-600" },
  { id: "trap", label: "Trap", emoji: "💎", gradient: "from-fuchsia-500 to-purple-700" },
  { id: "lofi", label: "Lo-fi", emoji: "🌙", gradient: "from-indigo-400 to-blue-700" },
  { id: "cinematic", label: "Cinématique", emoji: "🎬", gradient: "from-amber-400 to-rose-600" },
  { id: "rnb", label: "R&B", emoji: "💜", gradient: "from-rose-400 to-purple-600" },
  { id: "ambient", label: "Ambient", emoji: "✨", gradient: "from-emerald-400 to-teal-600" },
  { id: "drill", label: "Drill", emoji: "⚡", gradient: "from-zinc-400 to-slate-800" },
];

export interface TemplateMeta {
  moods: string[];
  genres: string[];
  duration: string;
  voices: string[];
}

export const templateMeta: Record<string, TemplateMeta> = {
  clip: {
    moods: ["Épique", "Rêveur"],
    genres: ["Synthwave", "Cinematic"],
    duration: "2-4 min",
    voices: ["Instrumental"],
  },
  song: {
    moods: ["Mélancolique", "Solaire"],
    genres: ["Pop", "R&B", "Trap"],
    duration: "3-4 min",
    voices: ["Voix féminine", "Voix masculine"],
  },
  instru: {
    moods: ["Agressif", "Sombre"],
    genres: ["Phonk", "Trap", "Techno"],
    duration: "2-6 min",
    voices: ["Instrumental"],
  },
  lyrics: {
    moods: ["Mélancolique", "Nostalgique"],
    genres: ["Pop", "R&B", "Drill"],
    duration: "—",
    voices: ["Rap", "Chœur"],
  },
  cover: {
    moods: ["Rêveur", "Solaire"],
    genres: ["Ambient", "Synthwave"],
    duration: "—",
    voices: ["Instrumental"],
  },
  vis: {
    moods: ["Épique", "Chill"],
    genres: ["Ambient", "Cinematic", "Techno"],
    duration: "1-3 min",
    voices: ["Instrumental"],
  },
};

export const templateDurations = ["Court (< 2 min)", "Standard (2-4 min)", "Long (> 4 min)"];
