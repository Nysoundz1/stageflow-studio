import React from 'react';
import {
  Mic2,
  Drum,
  Activity,
  Piano,
  Guitar,
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useStageFlowStore } from '../store/useStageFlowStore';
import { StemId } from '../types/stageflow';
import { WaveformCanvas } from './WaveformCanvas';

const STEM_ICONS: Record<StemId, React.ReactNode> = {
  vocals: <Mic2 className="h-4 w-4" />,
  drums:  <Drum className="h-4 w-4" />,
  bass:   <Activity className="h-4 w-4" />,
  keys:   <Piano className="h-4 w-4" />,
  guitar: <Guitar className="h-4 w-4" />,
  other:  <Sparkles className="h-4 w-4" />,
};

export const StemMixer: React.FC = () => {
  const {
    stems,
    arrangementBlocks,
    activeBlockIndex,
    currentTime,
    totalArrangementDuration,
    isPlaying,
    setStemVolume,
    setStemPan,
    toggleStemMute,
    toggleStemSolo,
    resetMixer,
    seekTo,
  } = useStageFlowStore();

  const anySolo = stems.some((s) => s.soloed);
  const currentBlock = arrangementBlocks[activeBlockIndex];

  const formatPan = (pan: number) => {
    if (Math.abs(pan) < 0.04) return 'C';
    if (pan < 0) return `L${Math.round(Math.abs(pan) * 100)}`;
    return `R${Math.round(pan * 100)}`;
  };

  return (
    <section
      data-testid="multi-track-stem-mixer"
      className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-4 shadow-xl backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Volume2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                6-Stem AI Multi-Track Mixer & Synchronized Waveforms
              </h2>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                6 Isolated Channels
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time Mute, Solo, Volume faders, Stereo Panning, and block-synced waveform scrubbing.
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="reset-mixer-btn"
          onClick={resetMixer}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear All Mute / Solo</span>
        </button>
      </div>

      {/* 6 Stem Track Rows */}
      <div className="space-y-2.5">
        {stems.map((stem) => {
          const activeInCurrentBlock = currentBlock ? (currentBlock.activeStems?.[stem.id] ?? true) : true;
          const effectiveAudible = activeInCurrentBlock && !stem.muted && (!anySolo || stem.soloed);

          return (
            <div
              key={stem.id}
              data-testid={`stem-track-${stem.id}`}
              className={`grid grid-cols-1 lg:grid-cols-12 items-center gap-3 rounded-xl border p-2.5 transition-all ${
                effectiveAudible
                  ? 'border-slate-800 bg-slate-950/75'
                  : 'border-slate-900 bg-slate-950/40 opacity-65'
              }`}
            >
              {/* Left 5 cols: Channel Strip Controls (Name, Mute, Solo, Volume, Pan) */}
              <div className="lg:col-span-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                {/* Stem Badge */}
                <div className="flex items-center gap-2 min-w-[130px]">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-950 font-bold shadow-sm"
                    style={{ backgroundColor: stem.color }}
                  >
                    {STEM_ICONS[stem.id]}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{stem.name}</span>
                      {!activeInCurrentBlock && (
                        <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] font-mono text-amber-400">
                          OFF IN BLOCK
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Vol: {Math.round(stem.volume * 100)}% • Pan: {formatPan(stem.pan)}
                    </div>
                  </div>
                </div>

                {/* Mute & Solo Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`stem-mute-${stem.id}`}
                    onClick={() => toggleStemMute(stem.id)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      stem.muted
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={`Mute ${stem.name}`}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    data-testid={`stem-solo-${stem.id}`}
                    onClick={() => toggleStemSolo(stem.id)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      stem.soloed
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={`Solo ${stem.name}`}
                  >
                    S
                  </button>
                </div>

                {/* Volume Fader */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                  {effectiveAudible ? (
                    <Volume2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  )}
                  <input
                    type="range"
                    data-testid={`stem-volume-${stem.id}`}
                    min={0}
                    max={1}
                    step={0.01}
                    value={stem.volume}
                    onChange={(e) => setStemVolume(stem.id, parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                    title={`${stem.name} Volume: ${Math.round(stem.volume * 100)}%`}
                  />
                </div>

                {/* Stereo Pan Slider */}
                <div className="flex items-center gap-1 w-24 shrink-0">
                  <span className="text-[10px] font-mono text-slate-500">L</span>
                  <input
                    type="range"
                    data-testid={`stem-pan-${stem.id}`}
                    min={-1}
                    max={1}
                    step={0.05}
                    value={stem.pan}
                    onDoubleClick={() => setStemPan(stem.id, 0)}
                    onChange={(e) => setStemPan(stem.id, parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 cursor-pointer"
                    title={`${stem.name} Pan: ${formatPan(stem.pan)} (Double-click to center)`}
                  />
                  <span className="text-[10px] font-mono text-slate-500">R</span>
                </div>
              </div>

              {/* Right 7 cols: Synchronized Block-Aware Canvas Waveform */}
              <div className="lg:col-span-7">
                <WaveformCanvas
                  stem={stem}
                  blocks={arrangementBlocks}
                  currentTime={currentTime}
                  totalDuration={totalArrangementDuration}
                  effectiveAudible={effectiveAudible}
                  isPlaying={isPlaying}
                  onSeek={seekTo}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

