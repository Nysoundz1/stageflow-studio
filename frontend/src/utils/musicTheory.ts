import { SongPayload, StemId } from '../types/stageflow';

const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

export function transposeNote(note: string, semitones: number, preferFlats = true): string {
  const idx = NOTE_TO_INDEX[note];
  if (idx === undefined) return note;
  const shifted = ((idx + semitones) % 12 + 12) % 12;
  return preferFlats ? CHROMATIC_FLAT[shifted] : CHROMATIC_SHARP[shifted];
}

export function transposeKeyName(keyName: string, semitones: number): string {
  if (!keyName) return 'C Minor';
  if (semitones === 0) return keyName;
  const parts = keyName.trim().split(/\s+/);
  const root = parts[0];
  const rest = parts.slice(1).join(' ');
  const newRoot = transposeNote(root, semitones, true);
  return rest ? `${newRoot} ${rest}` : newRoot;
}

export function transposeChordSymbol(chord: string, semitones: number): string {
  if (!chord || semitones === 0) return chord;
  // Match root note (e.g., C, Cm7, Abmaj7, F#m7/C#)
  return chord.replace(/([A-G][b#]?)/g, (match) => {
    return transposeNote(match, semitones, true);
  });
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function generateDeterministicPeaks(seed: number, length = 240): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < length; i++) {
    const v1 = Math.abs(Math.sin((i + seed * 7) * 0.19));
    const v2 = Math.abs(Math.cos((i * 1.7 + seed * 13) * 0.08));
    const env = i < 20 ? 0.45 : i > length - 25 ? 0.5 : 1.0;
    peaks.push(Number(Math.max(0.08, Math.min(0.98, (0.45 * v1 + 0.55 * v2) * env)).toFixed(3)));
  }
  return peaks;
}

export const INITIAL_DEMO_SONGS: SongPayload[] = [
  {
    id: 'neon-horizon',
    title: 'Neon Horizon (Live Studio Session)',
    artist: 'StageFlow Collective',
    bpm: 120,
    key: 'C Minor',
    rootNote: 'C',
    scaleMode: 'Minor',
    timeSignature: '4/4',
    totalBars: 24,
    duration: 48.0,
    engineBadge: 'HTDemucs 6s + Librosa BeatGrid',
    preloaded: true,
    beatGrid: Array.from({ length: 97 }, (_, i) => Number((i * 0.5).toFixed(3))),
    stems: [
      { id: 'vocals', name: 'Vocals', color: '#f43f5e', url: '/stems/neon-horizon/vocals.wav', volume: 0.90, pan: 0.0, muted: false, soloed: false, peaks: generateDeterministicPeaks(1) },
      { id: 'drums',  name: 'Drums',  color: '#f59e0b', url: '/stems/neon-horizon/drums.wav',  volume: 0.88, pan: 0.0, muted: false, soloed: false, peaks: generateDeterministicPeaks(2) },
      { id: 'bass',   name: 'Bass',   color: '#10b981', url: '/stems/neon-horizon/bass.wav',   volume: 0.86, pan: 0.0, muted: false, soloed: false, peaks: generateDeterministicPeaks(3) },
      { id: 'keys',   name: 'Keys',   color: '#06b6d4', url: '/stems/neon-horizon/keys.wav',   volume: 0.80, pan: -0.25, muted: false, soloed: false, peaks: generateDeterministicPeaks(4) },
      { id: 'guitar', name: 'Guitar', color: '#8b5cf6', url: '/stems/neon-horizon/guitar.wav', volume: 0.82, pan: 0.30, muted: false, soloed: false, peaks: generateDeterministicPeaks(5) },
      { id: 'other',  name: 'Backing / Other', color: '#ec4899', url: '/stems/neon-horizon/other.wav', volume: 0.76, pan: -0.15, muted: false, soloed: false, peaks: generateDeterministicPeaks(6) },
    ],
    sections: [
      {
        id: 'sec-intro',
        sourceSectionId: 'sec-intro',
        label: 'Intro',
        type: 'intro',
        startBar: 1,
        lengthBars: 4,
        startTime: 0.0,
        duration: 8.0,
        color: '#38bdf8',
        energy: 0.48,
        chords: ['Cm7', 'Abmaj7', 'Ebmaj7', 'Bb'],
        lyrics: [
          '[Atmospheric Synth & Pulse Intro]',
          'City lights flicker across the rain...',
          'Dialing in the midnight frequency',
          'Ready on the downbeat — 4, 3, 2, 1',
        ],
        activeStems: { vocals: false, drums: true, bass: true, keys: true, guitar: false, other: true },
      },
      {
        id: 'sec-verse1',
        sourceSectionId: 'sec-verse1',
        label: 'Verse 1',
        type: 'verse',
        startBar: 5,
        lengthBars: 4,
        startTime: 8.0,
        duration: 8.0,
        color: '#10b981',
        energy: 0.72,
        chords: ['Cm7', 'Abmaj7', 'Ebmaj7', 'Bb'],
        lyrics: [
          'Walking through the static of the boulevard',
          'Every neon shadow plays a silver chord',
          'Heartbeats locked in time with the underground',
          'Waiting for the chorus to lift us off the ground',
        ],
        activeStems: { vocals: true, drums: true, bass: true, keys: true, guitar: true, other: false },
      },
      {
        id: 'sec-chorus1',
        sourceSectionId: 'sec-chorus1',
        label: 'Chorus',
        type: 'chorus',
        startBar: 9,
        lengthBars: 4,
        startTime: 16.0,
        duration: 8.0,
        color: '#f43f5e',
        energy: 1.0,
        chords: ['Abmaj7', 'Ebmaj7', 'Bb', 'Cm7'],
        lyrics: [
          'We are chasing the Neon Horizon tonight!',
          'Running on a wave of electric light',
          'Turn the amplifiers all the way to ten',
          'Hold the frequency until we sing again!',
        ],
        activeStems: { vocals: true, drums: true, bass: true, keys: true, guitar: true, other: true },
      },
      {
        id: 'sec-verse2',
        sourceSectionId: 'sec-verse2',
        label: 'Verse 2',
        type: 'verse',
        startBar: 13,
        lengthBars: 4,
        startTime: 24.0,
        duration: 8.0,
        color: '#10b981',
        energy: 0.78,
        chords: ['Cm7', 'Abmaj7', 'Ebmaj7', 'Bb'],
        lyrics: [
          'Echoes bouncing off the canyon glass',
          'Every second moving twice as fast',
          'Bassline locked into the pocket deep',
          'Promises the midnight stage will keep',
        ],
        activeStems: { vocals: true, drums: true, bass: true, keys: true, guitar: true, other: true },
      },
      {
        id: 'sec-bridge',
        sourceSectionId: 'sec-bridge',
        label: 'Bridge',
        type: 'bridge',
        startBar: 17,
        lengthBars: 4,
        startTime: 32.0,
        duration: 8.0,
        color: '#a855f7',
        energy: 0.65,
        chords: ['Abmaj7', 'Bb', 'Cm7', 'G7'],
        lyrics: [
          'Strip the drums back — let the voices float',
          'Hanging on the tension of a single note',
          'Hands up in the spotlight across the floor',
          'Cue the band back in on beat four!',
        ],
        activeStems: { vocals: true, drums: false, bass: true, keys: true, guitar: false, other: true },
      },
      {
        id: 'sec-outro',
        sourceSectionId: 'sec-outro',
        label: 'Outro',
        type: 'outro',
        startBar: 21,
        lengthBars: 4,
        startTime: 40.0,
        duration: 8.0,
        color: '#f59e0b',
        energy: 0.55,
        chords: ['Cm7', 'Abmaj7', 'Ebmaj7', 'Cm9'],
        lyrics: [
          'Fading out into the morning glow...',
          'Neon Horizon — end of the show',
          '[Guitar & Synth Vamp Outro]',
          '[Hold Final Chord on Bar 24]',
        ],
        activeStems: { vocals: false, drums: true, bass: true, keys: true, guitar: true, other: true },
      },
    ],
  },
];

export const STEM_SHORT_CODES: Record<StemId, string> = {
  vocals: 'V',
  drums: 'D',
  bass: 'B',
  keys: 'K',
  guitar: 'G',
  other: 'O',
};

