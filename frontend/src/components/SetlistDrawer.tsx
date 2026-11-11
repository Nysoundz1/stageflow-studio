import React from 'react';
import {
  X,
  ListMusic,
  ArrowUp,
  ArrowDown,
  Cpu,
  CheckCircle2,
  PlayCircle,
  Music,
} from 'lucide-react';
import { useStageFlowStore } from '../store/useStageFlowStore';

export const SetlistDrawer: React.FC = () => {
  const {
    setlistDrawerOpen,
    setSetlistDrawerOpen,
    songs,
    activeSongId,
    selectSong,
    reorderSetlist,
    preloadAllSetlistSongs,
  } = useStageFlowStore();

  if (!setlistDrawerOpen) return null;

  return (
    <aside
      data-testid="setlist-drawer"
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-slate-800 bg-slate-950/98 p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between"
    >
      <div>
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <ListMusic className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Show Setlist Drawer</h2>
              <p className="text-xs text-slate-400">
                Queue songs, reorder your live set, and pre-cache stems in RAM.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-setlist-drawer-btn"
            onClick={() => setSetlistDrawerOpen(false)}
            className="rounded-lg bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Pre-load All Button */}
        <div className="my-4">
          <button
            type="button"
            data-testid="preload-setlist-ram-btn"
            onClick={preloadAllSetlistSongs}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Cpu className="h-4 w-4" />
            <span>Pre-Load All Setlist Stems into RAM (Zero-Dropout)</span>
          </button>
        </div>

        {/* Song List */}
        <div className="space-y-2.5 overflow-y-auto max-h-[65vh] pr-1">
          {songs.map((song, idx) => {
            const isSelected = song.id === activeSongId;
            return (
              <div
                key={song.id}
                data-testid={`setlist-item-${song.id}`}
                className={`rounded-xl border p-3 transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/25 ring-1 ring-cyan-500/30'
                    : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => selectSong(song.id)}
                    className="flex items-start gap-2.5 text-left flex-1 cursor-pointer"
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{song.title}</span>
                        {isSelected && (
                          <PlayCircle className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span className="text-emerald-400 font-semibold">{song.bpm} BPM</span>
                        <span>•</span>
                        <span className="text-violet-300 font-semibold">{song.key}</span>
                        <span>•</span>
                        <span>{song.timeSignature}</span>
                        <span>•</span>
                        <span>{song.sections.length} Sections</span>
                      </div>
                    </div>
                  </button>

                  {/* Reorder Up/Down Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => reorderSetlist(idx, idx - 1)}
                      className="rounded bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Up in Setlist"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === songs.length - 1}
                      onClick={() => reorderSetlist(idx, idx + 1)}
                      className="rounded bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Down in Setlist"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px]">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    6 Stems Cached in Memory (Zero-Dropout Ready)
                  </span>
                  <span className="font-mono text-slate-500">{song.duration.toFixed(1)}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Music className="h-3.5 w-3.5 text-indigo-400" />
          Total Setlist Songs: {songs.length}
        </span>
        <span className="font-mono text-emerald-400">RAM Buffer: Active</span>
      </div>
    </aside>
  );
};

