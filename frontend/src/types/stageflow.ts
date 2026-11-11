export type StemId = 'vocals' | 'drums' | 'bass' | 'keys' | 'guitar' | 'other';

export type StageMode = 'producer' | 'stage';

export type ClickRoutingMode = 'main' | 'iem_split' | 'dedicated_iem';

export interface StemTrack {
  id: StemId;
  name: string;
  color: string;
  url: string;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  peaks: number[];
}

export interface SectionBlock {
  id: string;
  sourceSectionId?: string;
  label: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'solo' | string;
  startBar: number;
  lengthBars: number;
  startTime: number;
  duration: number;
  color: string;
  energy?: number;
  chords: string[];
  lyrics: string[];
  activeStems: Record<StemId, boolean>;
}

export interface SongPayload {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  rootNote: string;
  scaleMode: string;
  timeSignature: string;
  totalBars: number;
  duration: number;
  engineBadge: string;
  beatGrid: number[];
  stems: StemTrack[];
  sections: SectionBlock[];
  preloaded?: boolean;
}

export interface ExportResult {
  status: string;
  filename: string;
  downloadUrl: string;
  durationSeconds: number;
  blocksRendered: number;
}

