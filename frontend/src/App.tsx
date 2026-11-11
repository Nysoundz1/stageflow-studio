import React, { useEffect, useState } from 'react';
import { Upload, Sparkles, Music2, X, CheckCircle2 } from 'lucide-react';
import { useStageFlowStore } from './store/useStageFlowStore';
import { TransportBar } from './components/TransportBar';
import { BlockArranger } from './components/BlockArranger';
import { StemMixer } from './components/StemMixer';
import { LiveStageView } from './components/LiveStageView';
import { SetlistDrawer } from './components/SetlistDrawer';
import { StemUploadModal } from './components/StemUploadModal';
import { transposeChordSymbol, transposeKeyName } from './utils/musicTheory';

export const App: React.FC = () => {
  const {
    mode,
    setMode,
    fetchSongsFromBackend,
    togglePlay,
    statusBanner,
    clearStatusBanner,
    uploadAudioFile,
    setUploadModalOpen,
    activeSong,
    arrangementBlocks,
    activeBlockIndex,
    pitchSemitones,
    setPitchSemitones,
    toggleSectionLoop,
    isLoopingSection,
    triggerPerformancePad,
    currentBar,
  } = useStageFlowStore();

  const [inlineDragOver, setInlineDragOver] = useState(false);

  useEffect(() => {
    fetchSongsFromBackend().then(() => {
      const params = new URLSearchParams(window.location.search);
      const qMode = params.get('mode');
      if (qMode === 'stage' || qMode === 'producer') {
        setMode(qMode);
      }
      const qPitch = params.get('pitch');
      if (qPitch !== null && !Number.isNaN(parseInt(qPitch, 10))) {
        setPitchSemitones(parseInt(qPitch, 10));
      }
      const qPad = params.get('pad');
      if (qPad !== null && !Number.isNaN(parseInt(qPad, 10))) {
        triggerPerformancePad(parseInt(qPad, 10));
      }
      const qLoop = params.get('loop');
      if (qLoop === '1' && !useStageFlowStore.getState().isLoopingSection) {
        toggleSectionLoop();
      }
    });
  }, [fetchSongsFromBackend, setMode, setPitchSemitones, triggerPerformancePad, toggleSectionLoop]);

  // Global Spacebar Play/Pause shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay]);

  const currentBlock = arrangementBlocks[activeBlockIndex] || arrangementBlocks[0];
  const barWithinSection = currentBlock
    ? Math.max(0, Math.min(currentBlock.lengthBars - 1, (currentBar - currentBlock.startBar) % currentBlock.lengthBars))
    : 0;
  const displayedKey = transposeKeyName(activeSong.key, pitchSemitones);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Studio Transport & Mode Switcher Bar */}
      <TransportBar />

      {/* Live Status Toast / Banner */}
      {statusBanner && (
        <div
          data-testid="status-banner"
          className="bg-cyan-950/80 border-b border-cyan-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-cyan-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={clearStatusBanner}
            className="text-cyan-400 hover:text-white p-0.5 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-4 space-y-4">
        {mode === 'producer' ? (
          <>
            {/* Module A: Inline Drag-and-Drop Audio Stem Ingestion Bar + Live Chord/Key Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Drag-and-Drop Uploader Strip */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setInlineDragOver(true);
                }}
                onDragLeave={() => setInlineDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setInlineDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) uploadAudioFile(f);
                }}
                onClick={() => setUploadModalOpen(true)}
                data-testid="inline-stem-dropzone"
                className={`lg:col-span-5 flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed px-4 py-2.5 transition-all cursor-pointer ${
                  inlineDragOver
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-slate-800 bg-slate-900/50 hover:border-cyan-500/40 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>AI Stem Ingestion Dropzone</span>
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                        .MP3 / .WAV / .FLAC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Drop any song to separate into 6 stems & detect BPM, Key & Sections
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-slate-700">
                  Browse / Ingest
                </span>
              </div>

              {/* Producer Live Transposed Chord & Lyric Monitor Strip */}
              <div
                data-testid="producer-chord-lyric-strip"
                className="lg:col-span-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400">
                    <Music2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        ACTIVE SECTION: <strong className="text-white">{currentBlock?.label}</strong>
                      </span>
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-300">
                        Key: {displayedKey} ({pitchSemitones >= 0 ? `+${pitchSemitones}` : pitchSemitones} st)
                      </span>
                    </div>
                    <div className="text-xs font-medium text-cyan-200 truncate max-w-[340px] mt-0.5">
                      {currentBlock?.lyrics?.[barWithinSection] || currentBlock?.lyrics?.[0]}
                    </div>
                  </div>
                </div>

                {/* Live Transposed Chords for Current Section */}
                <div className="flex items-center gap-1.5" data-testid="producer-transposed-chords">
                  {(currentBlock?.chords || []).map((chord, idx) => {
                    const activeBar = barWithinSection === idx;
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold transition-all ${
                          activeBar
                            ? 'border-violet-400 bg-violet-500/25 text-white shadow-sm'
                            : 'border-slate-800 bg-slate-950/80 text-slate-300'
                        }`}
                      >
                        {transposeChordSymbol(chord, pitchSemitones)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Module B: Producer "Stress-Free" Magnetic Section Block Arranger */}
            <BlockArranger />

            {/* Module A: 6-Stem Multi-Track Mixer & Synchronized Canvas Waveforms */}
            <StemMixer />
          </>
        ) : (
          /* Module C: Musician "Live Stage Mode" View */
          <LiveStageView />
        )}
      </main>

      {/* Slide-Over Setlist Drawer */}
      <SetlistDrawer />

      {/* Drag-and-Drop AI Stem Uploader Modal */}
      <StemUploadModal />

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-center text-[11px] text-slate-500 flex flex-wrap items-center justify-between max-w-[1600px] w-full mx-auto">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-cyan-500" />
          <span>StageFlow Studio • AI 6-Stem Separator, Non-Destructive Block Arranger & Ultra-Reliable Stage Rig</span>
        </div>
        <div className="font-mono text-slate-400">
          Shortcuts: [Space] Play/Pause • [1–8] Quantized Section Jump Pads • [L] Loop Active Section
        </div>
      </footer>
    </div>
  );
};

export default App;

