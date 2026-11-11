import React from 'react';
import {
  Play,
  Pause,
  Square,
  Upload,
  ListMusic,
  Sliders,
  Radio,
  Minus,
  Plus,
  Volume2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useStageFlowStore } from '../store/useStageFlowStore';
import { formatTimecode, transposeKeyName } from '../utils/musicTheory';

export const TransportBar: React.FC = () => {
  const {
    mode,
    setMode,
    activeSong,
    isPlaying,
    togglePlay,
    stopPlayback,
    currentTime,
    totalArrangementDuration,
    currentBar,
    currentBeat,
    currentSixteenth,
    pitchSemitones,
    setPitchSemitones,
    tempoScale,
    setTempoScale,
    masterVolume,
    setMasterVolume,
    setUploadModalOpen,
    setlistDrawerOpen,
    setSetlistDrawerOpen,
    songs,
    isLoopingSection,
  } = useStageFlowStore();

  const effectiveBpm = Math.round(activeSong.bpm * tempoScale);
  const displayedKey = transposeKeyName(activeSong.key, pitchSemitones);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md px-4 py-2.5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Active Track Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  StageFlow <span className="text-cyan-400">Studio</span>
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 border border-cyan-500/20">
                  {activeSong.engineBadge}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-200 truncate max-w-[200px]" data-testid="active-song-title">
                  {activeSong.title}
                </span>
                <span>•</span>
                <span>{activeSong.artist}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center-Left: Transport Controls & Bar/Beat LCD */}
        <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 shadow-inner">
          <button
            type="button"
            data-testid="play-pause-btn"
            onClick={togglePlay}
            className={`flex h-9 w-9 items-center justify-center rounded-lg font-semibold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 hover:bg-amber-400'
                : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
            }`}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            data-testid="stop-btn"
            onClick={stopPlayback}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title="Stop & Return to Start"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>

          {/* Bar : Beat : Sixteenth Digital Display */}
          <div className="flex items-center gap-3 border-l border-slate-800 pl-3 font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">BAR . BEAT . 16TH</div>
              <div className="text-sm font-bold text-cyan-400 tracking-wider" data-testid="bar-beat-display">
                {String(currentBar).padStart(3, '0')} . {currentBeat} . {currentSixteenth}
              </div>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">TIMECODE</div>
              <div className="text-sm font-semibold text-slate-200">
                {formatTimecode(currentTime)}{' '}
                <span className="text-xs text-slate-500">/ {formatTimecode(totalArrangementDuration)}</span>
              </div>
            </div>
          </div>

          {isLoopingSection && (
            <span
              data-testid="transport-loop-badge"
              className="ml-1 inline-flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-300 animate-pulse"
            >
              LOOP VAMP
            </span>
          )}
        </div>

        {/* Center-Right: Auto-Detected BPM, Musical Key, Time Signature & Pitch/Tempo Shifters */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5">
          {/* Detected BPM + Tempo Scale */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">TEMPO (BPM)</div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-emerald-400" data-testid="detected-bpm-badge">
                  {effectiveBpm} BPM
                </span>
                <span className="text-[11px] text-slate-400">({Math.round(tempoScale * 100)}%)</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => setTempoScale(tempoScale - 0.05)}
                className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                title="Slow Down Tempo (-5%)"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setTempoScale(1.0)}
                className="px-1.5 h-6 rounded bg-slate-800 text-[10px] font-medium text-slate-300 hover:bg-slate-700 cursor-pointer"
                title="Reset Tempo (100%)"
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => setTempoScale(tempoScale + 0.05)}
                className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                title="Speed Up Tempo (+5%)"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Detected Musical Key + Real-Time Pitch Transpose (-6 to +6 st) */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">KEY / PITCH SHIFT</div>
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="detected-key-badge"
                  className="font-mono text-sm font-bold text-violet-300"
                >
                  {displayedKey}
                </span>
                <span
                  data-testid="pitch-semitones-badge"
                  className={`rounded px-1.5 py-0.2 text-[11px] font-mono font-bold ${
                    pitchSemitones === 0
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  }`}
                >
                  {pitchSemitones > 0 ? `+${pitchSemitones} st` : `${pitchSemitones} st`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="pitch-down-btn"
                onClick={() => setPitchSemitones(pitchSemitones - 1)}
                disabled={pitchSemitones <= -6}
                className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                title="Transpose Down 1 Semitone"
              >
                <Minus className="h-3 w-3" />
              </button>
              <button
                type="button"
                data-testid="pitch-reset-btn"
                onClick={() => setPitchSemitones(0)}
                className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer"
                title="Reset Pitch Transpose (0 st)"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
              <button
                type="button"
                data-testid="pitch-up-btn"
                onClick={() => setPitchSemitones(pitchSemitones + 1)}
                disabled={pitchSemitones >= 6}
                className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                title="Transpose Up 1 Semitone"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Time Signature */}
          <div className="pr-2 border-r border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">TIME SIG</div>
            <div className="font-mono text-sm font-bold text-amber-400" data-testid="time-signature-badge">
              {activeSong.timeSignature}
            </div>
          </div>

          {/* Master Volume */}
          <div className="flex items-center gap-1.5">
            <Volume2 className="h-4 w-4 text-slate-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(e) => setMasterVolume( parseFloat(e.target.value) )}
              className="w-16 accent-cyan-400 cursor-pointer"
              title={`Master Output Volume: ${Math.round(masterVolume * 100)}%`}
            />
          </div>
        </div>

        {/* Right: Mode Switcher (Producer Arranger vs. Live Stage Mode) & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Top-level Mode Switcher */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              data-testid="mode-producer-btn"
              onClick={() => setMode('producer')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                mode === 'producer'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Producer Arranger</span>
            </button>
            <button
              type="button"
              data-testid="mode-stage-btn"
              onClick={() => setMode('stage')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                mode === 'stage'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Live Stage Mode</span>
            </button>
          </div>

          {/* Upload Audio Button */}
          <button
            type="button"
            data-testid="open-upload-modal-btn"
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">AI Stem Upload</span>
          </button>

          {/* Setlist Drawer Toggle */}
          <button
            type="button"
            data-testid="toggle-setlist-btn"
            onClick={() => setSetlistDrawerOpen(!setlistDrawerOpen)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              setlistDrawerOpen
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200'
            }`}
          >
            <ListMusic className="h-3.5 w-3.5 text-indigo-400" />
            <span>Setlist ({songs.length})</span>
          </button>
        </div>
      </div>
    </header>
  );
};

