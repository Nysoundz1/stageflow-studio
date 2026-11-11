import React, { useRef, useState } from 'react';
import { Upload, X, FileAudio, Sparkles, Loader2 } from 'lucide-react';
import { useStageFlowStore } from '../store/useStageFlowStore';

export const StemUploadModal: React.FC = () => {
  const {
    uploadModalOpen,
    setUploadModalOpen,
    isUploading,
    uploadAudioFile,
  } = useStageFlowStore();

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!uploadModalOpen) return null;

  const handleFile = async (file?: File) => {
    if (!file) return;
    await uploadAudioFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleGenerateTestUpload = async () => {
    // Creates a valid 2-second stereo WAV blob in browser memory to test the full upload + stem separation pipeline
    const sr = 22050;
    const numSamples = sr * 2;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sr;
      const sample = Math.sin(2 * Math.PI * 220 * t) * 0.4 + Math.sin(2 * Math.PI * 440 * t) * 0.25;
      view.setInt16(44 + i * 2, Math.max(-32767, Math.min(32767, sample * 32767)), true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const testFile = new File([blob], 'Starlight_Odyssey_Master.wav', { type: 'audio/wav' });
    await handleFile(testFile);
  };

  return (
    <div
      data-testid="stem-upload-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI 6-Stem Audio Ingestion</h2>
              <p className="text-xs text-slate-400">
                HTDemucs 6-Stem Separator + Librosa BPM, Key & Structural Section Detector
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUploadModalOpen(false)}
            className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drag and Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="audio-dropzone"
          className={`mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-cyan-400 bg-cyan-950/30'
              : 'border-slate-700 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-950'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.flac,.ogg,.m4a,audio/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
              <div className="text-sm font-bold text-white">
                Running AI 6-Stem Separation & Beat-Grid Segmentation...
              </div>
              <p className="text-xs text-slate-400">
                Isolating Vocals, Drums, Bass, Keys, Guitar, and Backing/Other
              </p>
            </div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 mb-3">
                <Upload className="h-7 w-7" />
              </div>
              <div className="text-sm font-bold text-white">
                Drag & drop your master audio file here, or click to browse
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Supports <span className="font-mono text-slate-200">.mp3</span>,{' '}
                <span className="font-mono text-slate-200">.wav</span>, and{' '}
                <span className="font-mono text-slate-200">.flac</span> stereo masters
              </p>
            </>
          )}
        </div>

        {/* Quick Demo Upload Trigger */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-950/90 border border-slate-800 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <FileAudio className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Want to test the AI ingestion pipeline without a local audio file?</span>
          </div>
          <button
            type="button"
            data-testid="simulate-upload-btn"
            disabled={isUploading}
            onClick={handleGenerateTestUpload}
            className="shrink-0 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors cursor-pointer"
          >
            Ingest Sample WAV
          </button>
        </div>
      </div>
    </div>
  );
};

