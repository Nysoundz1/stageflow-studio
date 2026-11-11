import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Download,
  RotateCcw,
  GripVertical,
  Sparkles,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useStageFlowStore } from '../store/useStageFlowStore';
import { StemId } from '../types/stageflow';
import { STEM_SHORT_CODES, transposeChordSymbol } from '../utils/musicTheory';

const STEM_ORDER: { id: StemId; label: string; color: string }[] = [
  { id: 'vocals', label: 'Vocals', color: '#f43f5e' },
  { id: 'drums',  label: 'Drums',  color: '#f59e0b' },
  { id: 'bass',   label: 'Bass',   color: '#10b981' },
  { id: 'keys',   label: 'Keys',   color: '#06b6d4' },
  { id: 'guitar', label: 'Guitar', color: '#8b5cf6' },
  { id: 'other',  label: 'Backing', color: '#ec4899' },
];

export const BlockArranger: React.FC = () => {
  const {
    arrangementBlocks,
    activeBlockIndex,
    queuedBlockIndex,
    reorderBlocks,
    duplicateBlock,
    deleteBlock,
    toggleBlockStem,
    resetArrangement,
    exportArrangement,
    isExporting,
    lastExportResult,
    triggerPerformancePad,
    pitchSemitones,
  } = useStageFlowStore();

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const fromIdx = draggedIdx ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    setDraggedIdx(null);
    setDragOverIdx(null);
    if (!Number.isNaN(fromIdx) && fromIdx !== targetIdx) {
      reorderBlocks(fromIdx, targetIdx);
    }
  };

  const totalBars = arrangementBlocks.reduce((acc, b) => acc + b.lengthBars, 0);

  return (
    <section
      data-testid="producer-block-arranger"
      className="rounded-2xl border border-slate-800/90 bg-slate-900/65 p-4 shadow-xl backdrop-blur-sm"
    >
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Magnetic Section Block Arranger
              </h2>
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                {arrangementBlocks.length} Blocks • {totalBars} Bars Total
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Drag & drop blocks to reorder the entire song, duplicate (`2x`), or toggle stems (`V D B K G O`) per section block.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastExportResult && (
            <a
              href={lastExportResult.downloadUrl}
              download={lastExportResult.filename}
              data-testid="download-exported-wav-link"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Ready: {lastExportResult.filename.slice(0, 24)}...</span>
            </a>
          )}

          <button
            type="button"
            data-testid="reset-arrangement-btn"
            onClick={resetArrangement}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Blocks</span>
          </button>

          <button
            type="button"
            data-testid="export-arrangement-btn"
            onClick={exportArrangement}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Rendering Mix...' : 'Export Arrangement (.WAV)'}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Magnetic Section Timeline */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5"
        data-testid="magnetic-section-timeline"
      >
        {arrangementBlocks.map((block, idx) => {
          const isCurrent = idx === activeBlockIndex;
          const isQueued = idx === queuedBlockIndex;
          const isDragOver = idx === dragOverIdx;

          return (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={() => {
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
              data-testid={`section-block-${idx}`}
              className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all select-none ${
                isCurrent
                  ? 'border-cyan-400 bg-slate-900/95 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : isQueued
                  ? 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-500/30 animate-pulse'
                  : isDragOver
                  ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
                  : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
              }`}
            >
              {/* Top Color Accent Bar */}
              <div
                className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl"
                style={{ backgroundColor: block.color }}
              />

              {/* Block Header & Drag Handle */}
              <div className="mt-1">
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => triggerPerformancePad(idx)}
                    className="flex items-center gap-1.5 text-left group-hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Click to jump or queue this section"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-slate-500 cursor-grab active:cursor-grabbing shrink-0" />
                    <span className="text-xs font-extrabold tracking-wide text-white truncate">
                      {idx + 1}. {block.label}
                    </span>
                  </button>

                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-cyan-300">
                      <Sparkles className="h-2.5 w-2.5" /> Active
                    </span>
                  )}
                  {isQueued && !isCurrent && (
                    <span className="inline-flex items-center rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                      Queued
                    </span>
                  )}
                </div>

                {/* Bar Range & Transposed Chords Preview */}
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    Bars {block.startBar}–{block.startBar + block.lengthBars - 1} ({block.lengthBars}B)
                  </span>
                  <span className="text-slate-500">{block.duration.toFixed(1)}s</span>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {block.chords.slice(0, 4).map((chord, cIdx) => (
                    <span
                      key={cIdx}
                      className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-300"
                    >
                      {transposeChordSymbol(chord, pitchSemitones)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Per-Block Stem Active Matrix (V D B K G O) */}
              <div className="mt-3 pt-2 border-t border-slate-800/80">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Block Stems (Toggle On/Off)
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {STEM_ORDER.map((st) => {
                    const isActive = block.activeStems?.[st.id] ?? true;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        data-testid={`block-${idx}-stem-${st.id}`}
                        onClick={() => toggleBlockStem(idx, st.id)}
                        className={`flex h-6 items-center justify-center rounded text-[10px] font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'text-slate-950 shadow-sm'
                            : 'bg-slate-900 text-slate-600 border border-slate-800 hover:text-slate-400'
                        }`}
                        style={isActive ? { backgroundColor: st.color } : undefined}
                        title={`${st.label}: ${isActive ? 'Enabled in this block' : 'Muted in this block'}`}
                      >
                        {STEM_SHORT_CODES[st.id]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Block Action Controls: Move Left, Move Right, Duplicate (2x), Delete */}
              <div className="mt-2.5 flex items-center justify-between gap-1 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid={`move-block-left-${idx}`}
                    disabled={idx === 0}
                    onClick={() => reorderBlocks(idx, idx - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move Section Left"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    data-testid={`move-block-right-${idx}`}
                    disabled={idx === arrangementBlocks.length - 1}
                    onClick={() => reorderBlocks(idx, idx + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Move Section Right"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid={`duplicate-block-${idx}`}
                    onClick={() => duplicateBlock(idx)}
                    className="flex items-center gap-1 rounded bg-slate-900 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 px-2 h-6 text-[10px] font-bold text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Duplicate Section (2x)"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    <span>2x</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-block-${idx}`}
                    onClick={() => deleteBlock(idx)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Section Block"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

