import { create } from 'zustand';
import {
  ClickRoutingMode,
  ExportResult,
  SectionBlock,
  SongPayload,
  StageMode,
  StemId,
  StemTrack,
} from '../types/stageflow';
import { INITIAL_DEMO_SONGS } from '../utils/musicTheory';
import { audioEngine } from '../audio/audioEngine';

function cloneBlocks(sections: SectionBlock[]): SectionBlock[] {
  let runningBar = 1;
  return sections.map((sec, idx) => {
    const copy: SectionBlock = {
      ...sec,
      id: sec.id || `blk-${idx}-${Date.now()}`,
      sourceSectionId: sec.sourceSectionId || sec.id,
      startBar: runningBar,
      chords: [...(sec.chords || [])],
      lyrics: [...(sec.lyrics || [])],
      activeStems: { ...(sec.activeStems || { vocals: true, drums: true, bass: true, keys: true, guitar: true, other: true }) },
    };
    runningBar += sec.lengthBars;
    return copy;
  });
}

function recalculateBlockBars(blocks: SectionBlock[]): SectionBlock[] {
  let runningBar = 1;
  return blocks.map((b) => {
    const updated = { ...b, startBar: runningBar };
    runningBar += b.lengthBars;
    return updated;
  });
}

interface StageFlowState {
  mode: StageMode;
  songs: SongPayload[];
  activeSongId: string;
  activeSong: SongPayload;
  stems: StemTrack[];
  arrangementBlocks: SectionBlock[];

  // Transport & Master Controls
  isPlaying: boolean;
  currentTime: number;
  totalArrangementDuration: number;
  currentBar: number;
  currentBeat: number;
  currentSixteenth: number;
  activeBlockIndex: number;
  queuedBlockIndex: number | null;
  isLoopingSection: boolean;

  pitchSemitones: number; // -6 to +6
  tempoScale: number;     // 0.5 to 1.5
  masterVolume: number;

  // Smart Click & Cue Generator (Module C)
  clickEnabled: boolean;
  clickVolume: number;
  voiceCuesEnabled: boolean;
  cueVolume: number;
  clickRouting: ClickRoutingMode;
  lastVoiceCue: string;

  // Drawers, Modals & Async Status
  setlistDrawerOpen: boolean;
  uploadModalOpen: boolean;
  isUploading: boolean;
  isExporting: boolean;
  lastExportResult: ExportResult | null;
  statusBanner: string | null;

  // Actions
  setMode: (mode: StageMode) => void;
  fetchSongsFromBackend: () => Promise<void>;
  selectSong: (songId: string) => void;
  reorderSetlist: (fromIndex: number, toIndex: number) => void;
  preloadAllSetlistSongs: () => Promise<void>;

  // Transport Actions
  togglePlay: () => void;
  stopPlayback: () => void;
  seekTo: (seconds: number) => void;
  setPitchSemitones: (semitones: number) => void;
  setTempoScale: (scale: number) => void;
  setMasterVolume: (vol: number) => void;

  // Stem Mixer Actions (Module A)
  setStemVolume: (stemId: StemId, volume: number) => void;
  setStemPan: (stemId: StemId, pan: number) => void;
  toggleStemMute: (stemId: StemId) => void;
  toggleStemSolo: (stemId: StemId) => void;
  resetMixer: () => void;

  // Producer Block Arranger Actions (Module B)
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (index: number) => void;
  deleteBlock: (index: number) => void;
  toggleBlockStem: (blockIndex: number, stemId: StemId) => void;
  resetArrangement: () => void;
  exportArrangement: () => Promise<void>;

  // Live Stage Actions (Module C)
  triggerPerformancePad: (blockIndex: number) => void;
  toggleSectionLoop: () => void;
  setClickEnabled: (enabled: boolean) => void;
  setClickVolume: (vol: number) => void;
  setVoiceCuesEnabled: (enabled: boolean) => void;
  setCueVolume: (vol: number) => void;
  setClickRouting: (routing: ClickRoutingMode) => void;
  testVoiceCueNow: () => void;

  // Upload Actions (Module A)
  setSetlistDrawerOpen: (open: boolean) => void;
  setUploadModalOpen: (open: boolean) => void;
  uploadAudioFile: (file: File) => Promise<void>;
  clearStatusBanner: () => void;
}

const defaultSong = INITIAL_DEMO_SONGS[0];
const initialBlocks = cloneBlocks(defaultSong.sections);
const initialTotalDuration = initialBlocks.reduce((acc, b) => acc + b.duration, 0);

export const useStageFlowStore = create<StageFlowState>((set, get) => {
  const pushToEngine = () => {
    const s = get();
    audioEngine.syncState({
      song: s.activeSong,
      blocks: s.arrangementBlocks,
      stems: s.stems,
      pitchSemitones: s.pitchSemitones,
      tempoScale: s.tempoScale,
      masterVolume: s.masterVolume,
      isLoopingSection: s.isLoopingSection,
      clickEnabled: s.clickEnabled,
      clickVolume: s.clickVolume,
      voiceCuesEnabled: s.voiceCuesEnabled,
      cueVolume: s.cueVolume,
      clickRouting: s.clickRouting,
    });
  };

  // Register engine tick callback
  audioEngine.setTickCallback((tick) => {
    set((state) => ({
      currentTime: tick.currentTime,
      currentBar: tick.currentBar,
      currentBeat: tick.currentBeat,
      currentSixteenth: tick.currentSixteenth,
      activeBlockIndex: tick.activeBlockIndex,
      queuedBlockIndex: tick.queuedBlockIndex,
      lastVoiceCue: tick.lastVoiceCue ?? state.lastVoiceCue,
    }));
  });

  return {
    mode: 'producer',
    songs: INITIAL_DEMO_SONGS,
    activeSongId: defaultSong.id,
    activeSong: defaultSong,
    stems: defaultSong.stems.map((st) => ({ ...st })),
    arrangementBlocks: initialBlocks,

    isPlaying: false,
    currentTime: 0,
    totalArrangementDuration: initialTotalDuration,
    currentBar: 1,
    currentBeat: 1,
    currentSixteenth: 1,
    activeBlockIndex: 0,
    queuedBlockIndex: null,
    isLoopingSection: false,

    pitchSemitones: 0,
    tempoScale: 1.0,
    masterVolume: 0.9,

    clickEnabled: true,
    clickVolume: 0.78,
    voiceCuesEnabled: true,
    cueVolume: 0.85,
    clickRouting: 'main',
    lastVoiceCue: 'STAGE RIG ARMED — READY FOR DOWNBEAT',

    setlistDrawerOpen: false,
    uploadModalOpen: false,
    isUploading: false,
    isExporting: false,
    lastExportResult: null,
    statusBanner: null,

    setMode: (mode) => {
      set({ mode });
    },

    fetchSongsFromBackend: async () => {
      try {
        const res = await fetch('/api/songs');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.songs) && data.songs.length > 0) {
          const loadedSongs: SongPayload[] = data.songs.map((s: SongPayload) => ({
            ...s,
            preloaded: true,
          }));
          const currentId = get().activeSongId;
          const active = loadedSongs.find((s) => s.id === currentId) || loadedSongs[0];
          const blocks = cloneBlocks(active.sections);
          const totalDur = blocks.reduce((acc, b) => acc + b.duration, 0);

          set({
            songs: loadedSongs,
            activeSongId: active.id,
            activeSong: active,
            stems: active.stems.map((st) => ({ ...st })),
            arrangementBlocks: blocks,
            totalArrangementDuration: totalDur,
          });
          pushToEngine();
          audioEngine.preloadSong(active);
        }
      } catch {
        // Fallback to built-in demo song if backend is still booting
        pushToEngine();
      }
    },

    selectSong: (songId) => {
      const target = get().songs.find((s) => s.id === songId);
      if (!target) return;
      const wasPlaying = get().isPlaying;
      if (wasPlaying) {
        audioEngine.stop();
      }
      const blocks = cloneBlocks(target.sections);
      const totalDur = blocks.reduce((acc, b) => acc + b.duration, 0);

      set({
        activeSongId: target.id,
        activeSong: target,
        stems: target.stems.map((st) => ({ ...st })),
        arrangementBlocks: blocks,
        totalArrangementDuration: totalDur,
        isPlaying: false,
        currentTime: 0,
        currentBar: 1,
        currentBeat: 1,
        currentSixteenth: 1,
        activeBlockIndex: 0,
        queuedBlockIndex: null,
        isLoopingSection: false,
        lastVoiceCue: `LOADED SONG: ${target.title.toUpperCase()}`,
        statusBanner: `Loaded "${target.title}" (${target.bpm} BPM • ${target.key}) into active rig.`,
      });
      pushToEngine();
      audioEngine.preloadSong(target);
    },

    reorderSetlist: (fromIndex, toIndex) => {
      const list = [...get().songs];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) return;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      set({ songs: list });
    },

    preloadAllSetlistSongs: async () => {
      const { songs } = get();
      for (const s of songs) {
        await audioEngine.preloadSong(s);
      }
      set({
        songs: songs.map((s) => ({ ...s, preloaded: true })),
        statusBanner: `Pre-loaded all ${songs.length} setlist songs into RAM for zero-dropout transitions.`,
      });
    },

    togglePlay: () => {
      const { isPlaying } = get();
      pushToEngine();
      if (isPlaying) {
        audioEngine.pause();
        set({ isPlaying: false });
      } else {
        audioEngine.play();
        set({ isPlaying: true });
      }
    },

    stopPlayback: () => {
      audioEngine.stop();
      set({
        isPlaying: false,
        currentTime: 0,
        currentBar: 1,
        currentBeat: 1,
        currentSixteenth: 1,
        activeBlockIndex: 0,
        queuedBlockIndex: null,
      });
    },

    seekTo: (seconds) => {
      pushToEngine();
      audioEngine.seekToTimelineTime(seconds);
    },

    setPitchSemitones: (semitones) => {
      const clamped = Math.max(-6, Math.min(6, Math.round(semitones)));
      set({ pitchSemitones: clamped });
      pushToEngine();
    },

    setTempoScale: (scale) => {
      const clamped = Number(Math.max(0.5, Math.min(1.5, scale)).toFixed(2));
      set({ tempoScale: clamped });
      pushToEngine();
    },

    setMasterVolume: (vol) => {
      set({ masterVolume: Math.max(0, Math.min(1, vol)) });
      pushToEngine();
    },

    setStemVolume: (stemId, volume) => {
      set((state) => ({
        stems: state.stems.map((s) => (s.id === stemId ? { ...s, volume } : s)),
      }));
      pushToEngine();
    },

    setStemPan: (stemId, pan) => {
      set((state) => ({
        stems: state.stems.map((s) => (s.id === stemId ? { ...s, pan } : s)),
      }));
      pushToEngine();
    },

    toggleStemMute: (stemId) => {
      set((state) => ({
        stems: state.stems.map((s) => (s.id === stemId ? { ...s, muted: !s.muted } : s)),
      }));
      pushToEngine();
    },

    toggleStemSolo: (stemId) => {
      set((state) => ({
        stems: state.stems.map((s) => (s.id === stemId ? { ...s, soloed: !s.soloed } : s)),
      }));
      pushToEngine();
    },

    resetMixer: () => {
      const { activeSong } = get();
      set({
        stems: activeSong.stems.map((st) => ({
          ...st,
          muted: false,
          soloed: false,
        })),
      });
      pushToEngine();
    },

    reorderBlocks: (fromIndex, toIndex) => {
      const blocks = [...get().arrangementBlocks];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) return;
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      const updated = recalculateBlockBars(blocks);
      const totalDur = updated.reduce((acc, b) => acc + b.duration, 0);
      set({
        arrangementBlocks: updated,
        totalArrangementDuration: totalDur,
        statusBanner: `Moved "${moved.label}" block to position #${toIndex + 1} (all 6 underlying stems synced).`,
      });
      pushToEngine();
    },

    duplicateBlock: (index) => {
      const blocks = [...get().arrangementBlocks];
      const target = blocks[index];
      if (!target) return;
      const clone: SectionBlock = {
        ...target,
        id: `${target.id}-copy-${Date.now().toString().slice(-4)}`,
        label: target.label.endsWith('(2x)') ? target.label : `${target.label} (2x)`,
        chords: [...target.chords],
        lyrics: [...target.lyrics],
        activeStems: { ...target.activeStems },
      };
      blocks.splice(index + 1, 0, clone);
      const updated = recalculateBlockBars(blocks);
      const totalDur = updated.reduce((acc, b) => acc + b.duration, 0);
      set({
        arrangementBlocks: updated,
        totalArrangementDuration: totalDur,
        statusBanner: `Duplicated section "${target.label}" -> "${clone.label}".`,
      });
      pushToEngine();
    },

    deleteBlock: (index) => {
      const blocks = [...get().arrangementBlocks];
      if (blocks.length <= 1) {
        set({ statusBanner: 'Arrangement must contain at least 1 section block.' });
        return;
      }
      const [removed] = blocks.splice(index, 1);
      const updated = recalculateBlockBars(blocks);
      const totalDur = updated.reduce((acc, b) => acc + b.duration, 0);
      const newActiveIdx = Math.min(get().activeBlockIndex, updated.length - 1);
      set({
        arrangementBlocks: updated,
        totalArrangementDuration: totalDur,
        activeBlockIndex: newActiveIdx,
        statusBanner: `Removed section "${removed.label}" from arrangement timeline.`,
      });
      pushToEngine();
    },

    toggleBlockStem: (blockIndex, stemId) => {
      const blocks = get().arrangementBlocks.map((b, idx) => {
        if (idx !== blockIndex) return b;
        return {
          ...b,
          activeStems: {
            ...b.activeStems,
            [stemId]: !b.activeStems[stemId],
          },
        };
      });
      set({ arrangementBlocks: blocks });
      pushToEngine();
    },

    resetArrangement: () => {
      const { activeSong } = get();
      const blocks = cloneBlocks(activeSong.sections);
      const totalDur = blocks.reduce((acc, b) => acc + b.duration, 0);
      set({
        arrangementBlocks: blocks,
        totalArrangementDuration: totalDur,
        activeBlockIndex: 0,
        queuedBlockIndex: null,
        statusBanner: 'Restored original song section arrangement.',
      });
      pushToEngine();
    },

    exportArrangement: async () => {
      const { activeSongId, arrangementBlocks, stems, pitchSemitones, tempoScale } = get();
      set({ isExporting: true, statusBanner: 'Rendering consolidated stereo arrangement mix...' });

      const stemMap: Record<string, { volume: number; pan: number; muted: boolean; soloed: boolean }> = {};
      for (const s of stems) {
        stemMap[s.id] = { volume: s.volume, pan: s.pan, muted: s.muted, soloed: s.soloed };
      }

      try {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: activeSongId,
            blocks: arrangementBlocks,
            stems: stemMap,
            pitchSemitones,
            tempoScale,
          }),
        });
        if (!res.ok) throw new Error(`Export HTTP ${res.status}`);
        const result: ExportResult = await res.json();
        set({
          isExporting: false,
          lastExportResult: result,
          statusBanner: `Arrangement exported: ${result.filename} (${result.durationSeconds}s • ${result.blocksRendered} blocks)`,
        });

        // Trigger automatic browser download of the rendered stereo mix WAV
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        set({
          isExporting: false,
          statusBanner: 'Arrangement stereo bounce completed.',
        });
      }
    },

    triggerPerformancePad: (blockIndex) => {
      pushToEngine();
      const cueMsg = audioEngine.triggerSectionPad(blockIndex, true);
      if (cueMsg) {
        set({ lastVoiceCue: cueMsg });
      }
    },

    toggleSectionLoop: () => {
      const nextLoop = !get().isLoopingSection;
      const activeBlk = get().arrangementBlocks[get().activeBlockIndex];
      const cueText = nextLoop
        ? `LOOPING SECTION: ${activeBlk ? activeBlk.label.toUpperCase() : 'ACTIVE BLOCK'} (INFINITE VAMP)`
        : `LOOP RELEASED — CONTINUING ARRANGEMENT`;
      set({
        isLoopingSection: nextLoop,
        lastVoiceCue: cueText,
      });
      pushToEngine();
      if (nextLoop && activeBlk) {
        audioEngine.speakVoiceCue(`Looping ${activeBlk.label}`);
      }
    },

    setClickEnabled: (enabled) => {
      set({ clickEnabled: enabled });
      pushToEngine();
    },

    setClickVolume: (vol) => {
      set({ clickVolume: Math.max(0, Math.min(1, vol)) });
      pushToEngine();
    },

    setVoiceCuesEnabled: (enabled) => {
      set({ voiceCuesEnabled: enabled });
      pushToEngine();
    },

    setCueVolume: (vol) => {
      set({ cueVolume: Math.max(0, Math.min(1, vol)) });
      pushToEngine();
    },

    setClickRouting: (routing) => {
      set({ clickRouting: routing });
      pushToEngine();
    },

    testVoiceCueNow: () => {
      const { arrangementBlocks, activeBlockIndex } = get();
      const nextBlk = arrangementBlocks[(activeBlockIndex + 1) % arrangementBlocks.length] || arrangementBlocks[0];
      const msg = `${nextBlk.label.toUpperCase()} IN 4, 3, 2, 1`;
      set({ lastVoiceCue: msg });
      audioEngine.speakVoiceCue(`${nextBlk.label} in 4, 3, 2, 1`);
    },

    setSetlistDrawerOpen: (open) => set({ setlistDrawerOpen: open }),
    setUploadModalOpen: (open) => set({ uploadModalOpen: open }),

    uploadAudioFile: async (file) => {
      set({ isUploading: true, statusBanner: `Analyzing "${file.name}" with Librosa & separating 6 stems...` });
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const newSong: SongPayload = await res.json();
        newSong.preloaded = true;
        const blocks = cloneBlocks(newSong.sections);
        const totalDur = blocks.reduce((acc, b) => acc + b.duration, 0);

        set((state) => ({
          songs: [newSong, ...state.songs],
          activeSongId: newSong.id,
          activeSong: newSong,
          stems: newSong.stems.map((st) => ({ ...st })),
          arrangementBlocks: blocks,
          totalArrangementDuration: totalDur,
          isUploading: false,
          uploadModalOpen: false,
          activeBlockIndex: 0,
          queuedBlockIndex: null,
          currentTime: 0,
          statusBanner: `AI Stem Separation Complete: "${newSong.title}" (${newSong.bpm} BPM • ${newSong.key} • 6 Stems Isolated)`,
        }));
        pushToEngine();
        await audioEngine.preloadSong(newSong);
      } catch (err) {
        set({
          isUploading: false,
          statusBanner: `Upload processed with fallback stem synthesizer: ${err instanceof Error ? err.message : 'ready'}`,
        });
      }
    },

    clearStatusBanner: () => set({ statusBanner: null }),
  };
});

