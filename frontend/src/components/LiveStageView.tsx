import React, { useEffect } from 'react';
import {
  Repeat,
  Radio,
  Volume2,
  VolumeX,
  Headphones,
  Music2,
  Sparkles,
  Zap,
  Mic,
  CheckCircle2,
} from 'lucide-react';
import { useStageFlowStore } from '../store/useStageFlowStore';
import { ClickRoutingMode } from '../types/stageflow';
import { transposeChordSymbol, transposeKeyName } from '../utils/musicTheory';

export const LiveStageView: React.FC = () => {
  const {
    activeSong,
    arrangementBlocks,
    activeBlockIndex,
    queuedBlockIndex,
    isLoopingSection,
    toggleSectionLoop,
    triggerPerformancePad,
    currentBar,
    currentBeat,
    isPlaying,
    pitchSemitones,
    tempoScale,
    clickEnabled,
    setClickEnabled,
    clickVolume,
    setClickVolume,
    voiceCuesEnabled,
    setVoiceCuesEnabled,
    cueVolume,
    setCueVolume,
    clickRouting,
    setClickRouting,
    lastVoiceCue,
    testVoiceCueNow,
  } = useStageFlowStore();

  // Keyboard shortcuts for onstage performance pads (Keys 1-8 and Key L for Loop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key >= '1' && e.key <= '8') {
        const padIdx = parseInt(e.key, 10) - 1;
        const targetBlockIdx = padIdx < arrangementBlocks.length ? padIdx : padIdx % arrangementBlocks.length;
        triggerPerformancePad(targetBlockIdx);
      } else if (e.key.toLowerCase() === 'l') {
        toggleSectionLoop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [arrangementBlocks.length, triggerPerformancePad, toggleSectionLoop]);

  const currentBlock = arrangementBlocks[activeBlockIndex] || arrangementBlocks[0];
  const nextBlockIndex =
    queuedBlockIndex !== null
      ? queuedBlockIndex
      : isLoopingSection
      ? activeBlockIndex
      : (activeBlockIndex + 1) % arrangementBlocks.length;
  const nextBlock = arrangementBlocks[nextBlockIndex] || currentBlock;

  const transposedKey = transposeKeyName(activeSong.key, pitchSemitones);
  const effectiveBpm = Math.round(activeSong.bpm * tempoScale);

  // Build 8 Performance Pads mapped to song sections
  const eightPads = Array.from({ length: 8 }, (_, padIdx) => {
    const blockIdx = padIdx < arrangementBlocks.length ? padIdx : padIdx % arrangementBlocks.length;
    const blk = arrangementBlocks[blockIdx];
    const isRepeatShortcut = padIdx >= arrangementBlocks.length;
    return {
      padNumber: padIdx + 1,
      blockIdx,
      block: blk,
      displayLabel: isRepeatShortcut ? `${blk.label} (Encore)` : blk.label,
      midiNote: `MIDI C${padIdx + 1} / Key [${padIdx + 1}]`,
    };
  });

  // Active bar offset within current block (0..3)
  const barWithinSection = currentBlock
    ? Math.max(0, Math.min(currentBlock.lengthBars - 1, (currentBar - currentBlock.startBar) % currentBlock.lengthBars))
    : 0;

  return (
    <div data-testid="live-stage-mode-view" className="space-y-4">
      {/* Top Row: Live Stage Status Banner & Smart Click / Cue Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 Cols: Quantized Section Looper & 8 Oversized Performance Jump Pads */}
        <div className="lg:col-span-7 rounded-2xl border-2 border-slate-800 bg-slate-950 p-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-black uppercase tracking-wider text-white">
                  Quantized Section Looper & 8 Jump Pads
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap any pad (or press keys <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">1–8</kbd>) to queue a quantized jump on the next bar downbeat.
              </p>
            </div>

            {/* Oversized LOOP SECTION Button */}
            <button
              type="button"
              data-testid="loop-section-btn"
              onClick={toggleSectionLoop}
              className={`flex items-center gap-2.5 rounded-2xl border-2 px-5 py-3 text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                isLoopingSection
                  ? 'border-amber-300 bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/40 animate-pulse'
                  : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-amber-400/60 hover:bg-slate-800'
              }`}
            >
              <Repeat className="h-5 w-5" />
              <span>{isLoopingSection ? 'LOOPING SECTION (ACTIVE)' : 'LOOP SECTION [KEY L]'}</span>
            </button>
          </div>

          {/* 8 Oversized Touch/MIDI Performance Pads */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="stage-performance-pads">
            {eightPads.map((pad) => {
              const isCurrent = pad.blockIdx === activeBlockIndex && pad.padNumber <= arrangementBlocks.length;
              const isQueued = pad.blockIdx === queuedBlockIndex && pad.padNumber <= arrangementBlocks.length;

              return (
                <button
                  key={pad.padNumber}
                  type="button"
                  data-testid={`stage-pad-${pad.padNumber}`}
                  onClick={() => triggerPerformancePad(pad.blockIdx)}
                  className={`relative flex flex-col justify-between rounded-2xl border-2 p-3.5 text-left min-h-[116px] transition-all cursor-pointer select-none ${
                    isCurrent
                      ? 'border-emerald-400 bg-emerald-950/40 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/20'
                      : isQueued
                      ? 'border-amber-400 bg-amber-950/40 ring-4 ring-amber-500/25 animate-pulse'
                      : 'border-slate-800 bg-slate-900/90 hover:border-slate-600 hover:bg-slate-900'
                  }`}
                >
                  {/* Top Bar Indicator */}
                  <div
                    className="absolute inset-x-0 top-0 h-2 rounded-t-xl"
                    style={{ backgroundColor: pad.block?.color || '#38bdf8' }}
                  />

                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="rounded-md bg-slate-950/90 border border-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                      PAD {pad.padNumber}
                    </span>
                    {isCurrent && (
                      <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                        LIVE NOW
                      </span>
                    )}
                    {isQueued && !isCurrent && (
                      <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                        NEXT BAR
                      </span>
                    )}
                  </div>

                  <div className="my-2">
                    <div className="text-base font-black tracking-tight text-white truncate">
                      {pad.displayLabel}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      Bars {pad.block?.startBar}–{(pad.block?.startBar || 1) + (pad.block?.lengthBars || 4) - 1} ({pad.block?.lengthBars} Bars)
                    </div>
                  </div>

                  {/* Transposed Chords Mini Preview on Pad */}
                  <div className="flex items-center gap-1 overflow-hidden">
                    {(pad.block?.chords || []).slice(0, 4).map((ch, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-slate-950/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300"
                      >
                        {transposeChordSymbol(ch, pitchSemitones)}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Smart Click & Voice Cue Generator + IEM Output Routing */}
        <div
          data-testid="smart-click-cue-panel"
          className="lg:col-span-5 rounded-2xl border-2 border-slate-800 bg-slate-950 p-4 shadow-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-black uppercase tracking-wider text-white">
                  Smart Click & Voice Cue Bus
                </h2>
              </div>
              <span className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 font-mono text-xs font-bold text-cyan-300">
                {effectiveBpm} BPM • {activeSong.timeSignature}
              </span>
            </div>

            {/* 4 Oversized Visual Metronome Beat Flashers (1 - 2 - 3 - 4) */}
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {[1, 2, 3, 4].map((beatNum) => {
                const isActiveBeat = isPlaying && currentBeat === beatNum;
                const isDownbeat = beatNum === 1;
                return (
                  <div
                    key={beatNum}
                    data-testid={`metronome-beat-led-${beatNum}`}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 py-2.5 transition-all ${
                      isActiveBeat
                        ? isDownbeat
                          ? 'border-rose-400 bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-[1.03]'
                          : 'border-cyan-400 bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/40 scale-[1.03]'
                        : 'border-slate-800 bg-slate-900/80 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {isDownbeat ? 'DOWNBEAT' : `BEAT`}
                    </span>
                    <span className="text-xl font-black font-mono">{beatNum}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Voice Cue Readout Box */}
            <div className="mb-4 rounded-xl border border-indigo-500/40 bg-indigo-950/30 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Mic className="h-4 w-4 text-indigo-400 shrink-0 animate-pulse" />
                <div className="truncate">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    ACTIVE VOICE CUE ANNOUNCER
                  </div>
                  <div
                    data-testid="live-voice-cue-readout"
                    className="text-xs font-extrabold font-mono text-white truncate"
                  >
                    "{lastVoiceCue}"
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="trigger-test-cue-btn"
                onClick={testVoiceCueNow}
                className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
              >
                Speak Cue
              </button>
            </div>

            {/* Click Channel & Voice Cue Channel Controls */}
            <div className="space-y-3">
              {/* Quantized Metronome Click Row */}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/90 border border-slate-800 p-2.5">
                <button
                  type="button"
                  data-testid="toggle-click-btn"
                  onClick={() => setClickEnabled(!clickEnabled)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    clickEnabled
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {clickEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span>Metronome Click: {clickEnabled ? 'ON' : 'OFF'}</span>
                </button>
                <div className="flex items-center gap-2 flex-1 max-w-[170px]">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={clickVolume}
                    onChange={(e) => setClickVolume(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-300 w-9 text-right">
                    {Math.round(clickVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* Voice Cue Synthesizer Row */}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/90 border border-slate-800 p-2.5">
                <button
                  type="button"
                  data-testid="toggle-voice-cues-btn"
                  onClick={() => setVoiceCuesEnabled(!voiceCuesEnabled)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    voiceCuesEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  <span>Voice Cues: {voiceCuesEnabled ? 'ON' : 'OFF'}</span>
                </button>
                <div className="flex items-center gap-2 flex-1 max-w-[170px]">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={cueVolume}
                    onChange={(e) => setCueVolume(parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-300 w-9 text-right">
                    {Math.round(cueVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Output Routing Selector (Main Out vs. Band IEM Click Out) */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Audio Output Routing (Main FOH vs. Band IEM Click Out)
            </div>
            <div className="grid grid-cols-3 gap-2" data-testid="output-routing-selector">
              {(
                [
                  { id: 'main', label: 'Main Stereo Out', desc: 'Click + Stems Mixed' },
                  { id: 'iem_split', label: 'Band IEM Split (L/R)', desc: 'L: Click/Cue • R: FOH' },
                  { id: 'dedicated_iem', label: 'Dedicated IEM Bus', desc: 'Ch 3/4 IEM Click Out' },
                ] as { id: ClickRoutingMode; label: string; desc: string }[]
              ).map((route) => {
                const active = clickRouting === route.id;
                return (
                  <button
                    key={route.id}
                    type="button"
                    data-testid={`routing-option-${route.id}`}
                    onClick={() => setClickRouting(route.id)}
                    className={`flex flex-col items-start rounded-xl border p-2 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-cyan-950/40 text-white'
                        : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs font-bold">
                      {active && <CheckCircle2 className="h-3 w-3 text-cyan-400 shrink-0" />}
                      <span className="truncate">{route.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5">{route.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Synced Chord & Lyric Stage Teleprompter (Auto-Transposing with Pitch Shift) */}
      <div
        data-testid="stage-chord-lyric-teleprompter"
        className="rounded-2xl border-2 border-slate-800 bg-slate-950 p-5 shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Music2 className="h-5 w-5 text-violet-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-white">
                  Synced Chord & Lyric Stage Teleprompter
                </h2>
                <span
                  data-testid="teleprompter-key-badge"
                  className="rounded-lg bg-violet-500/20 border border-violet-500/40 px-2.5 py-0.5 font-mono text-xs font-bold text-violet-300"
                >
                  Stage Key: {transposedKey} ({pitchSemitones >= 0 ? `+${pitchSemitones}` : pitchSemitones} st)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bar-by-bar chord progression and lyrics automatically transpose in real time when Master Pitch is shifted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs">
              <span className="text-slate-400">ACTIVE SECTION: </span>
              <span className="font-bold text-emerald-400">{currentBlock?.label}</span>
            </div>
            <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs">
              <span className="text-slate-400">UP NEXT: </span>
              <span className="font-bold text-amber-400">
                {isLoopingSection ? `${currentBlock?.label} (LOOPING)` : nextBlock?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Bar-by-Bar Transposed Chord Cards + Stage Lyrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 7 Cols: 4 Oversized Bar-by-Bar Chord Progression Cards */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Current Section Bar-by-Bar Chords ({currentBlock?.label})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="teleprompter-chords">
              {(currentBlock?.chords || ['Cm7', 'Abmaj7', 'Ebmaj7', 'Bb']).map((rawChord, cIdx) => {
                const transposedChord = transposeChordSymbol(rawChord, pitchSemitones);
                const isCurrentBarCard = barWithinSection === cIdx;
                const barNumber = (currentBlock?.startBar || 1) + cIdx;

                return (
                  <div
                    key={cIdx}
                    data-testid={`teleprompter-chord-card-${cIdx}`}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all ${
                      isCurrentBarCard
                        ? 'border-violet-400 bg-violet-950/40 shadow-xl shadow-violet-500/20 scale-[1.03]'
                        : 'border-slate-800 bg-slate-900/80'
                    }`}
                  >
                    <span className="text-[11px] font-mono font-bold uppercase text-slate-400">
                      BAR {barNumber}
                    </span>
                    <span
                      data-testid={`transposed-chord-${cIdx}`}
                      className="my-2 text-2xl sm:text-3xl font-black font-mono tracking-tight text-white"
                    >
                      {transposedChord}
                    </span>
                    {pitchSemitones !== 0 && (
                      <span className="text-[10px] font-mono text-violet-300">
                        (Orig: {rawChord})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upcoming Section Chord Preview Bar */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                NEXT SECTION ({nextBlock?.label}) CHORDS:
              </span>
              <div className="flex items-center gap-2">
                {(nextBlock?.chords || []).map((ch, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1 font-mono text-xs font-bold text-amber-300"
                  >
                    {transposeChordSymbol(ch, pitchSemitones)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Synced High-Contrast Stage Lyrics Prompter */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/75 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Synced Stage Lyrics
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400">
                <Sparkles className="h-3 w-3" /> Auto-Scroll Active
              </span>
            </div>

            <div className="space-y-2.5 my-auto" data-testid="teleprompter-lyrics">
              {(currentBlock?.lyrics || []).map((line, lIdx) => {
                const isActiveLine = barWithinSection === lIdx;
                return (
                  <div
                    key={lIdx}
                    className={`rounded-xl px-3.5 py-2.5 font-semibold transition-all ${
                      isActiveLine
                        ? 'bg-cyan-500/15 border-l-4 border-cyan-400 text-lg text-white shadow-sm'
                        : 'text-sm text-slate-400'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

