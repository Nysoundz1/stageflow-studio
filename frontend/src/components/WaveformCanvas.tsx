import React, { useEffect, useRef } from 'react';
import { SectionBlock, StemTrack } from '../types/stageflow';

interface WaveformCanvasProps {
  stem: StemTrack;
  blocks: SectionBlock[];
  currentTime: number;
  totalDuration: number;
  effectiveAudible: boolean;
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  stem,
  blocks,
  currentTime,
  totalDuration,
  effectiveAudible,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 720;
    const height = canvas.clientHeight || 58;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const safeTotal = Math.max(1, totalDuration);
    const playheadX = Math.max(0, Math.min(width, (currentTime / safeTotal) * width));
    const midY = height / 2;

    // 1. Draw subtle section block backgrounds & dividers
    let accTime = 0;
    blocks.forEach((blk, bIdx) => {
      const xStart = (accTime / safeTotal) * width;
      const xWidth = (blk.duration / safeTotal) * width;
      const stemActiveInBlock = blk.activeStems?.[stem.id] ?? true;

      // Alternate block shading
      ctx.fillStyle = stemActiveInBlock
        ? bIdx % 2 === 0
          ? 'rgba(15, 23, 42, 0.35)'
          : 'rgba(30, 41, 59, 0.35)'
        : 'rgba(2, 6, 23, 0.78)';
      ctx.fillRect(xStart, 0, xWidth, height);

      // Divider line
      if (bIdx > 0) {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xStart, 0);
        ctx.lineTo(xStart, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw waveform bars for this block mapped from the original song peaks
      const numBarsInBlock = Math.max(6, Math.floor(xWidth / 3.5));
      const peaks = stem.peaks?.length ? stem.peaks : [0.3, 0.5, 0.7, 0.4];
      const origSongDur = 48.0;
      const origStartRatio = Math.max(0, Math.min(0.95, blk.startTime / origSongDur));
      const origSpanRatio = Math.max(0.05, Math.min(1.0 - origStartRatio, blk.duration / origSongDur));

      for (let i = 0; i < numBarsInBlock; i++) {
        const barX = xStart + (i / numBarsInBlock) * xWidth;
        const peakRatio = origStartRatio + (i / numBarsInBlock) * origSpanRatio;
        const peakIdx = Math.min(peaks.length - 1, Math.floor(peakRatio * peaks.length));
        const rawAmp = peaks[peakIdx] ?? 0.35;
        const scaledAmp = rawAmp * Math.min(1.15, stem.volume + 0.15);
        const barH = Math.max(3, scaledAmp * (height * 0.8));

        const isPlayed = barX <= playheadX;
        if (!effectiveAudible || !stemActiveInBlock) {
          ctx.fillStyle = 'rgba(71, 85, 105, 0.32)';
        } else {
          ctx.fillStyle = stem.color;
          ctx.globalAlpha = isPlayed ? 0.96 : 0.52;
        }

        ctx.beginPath();
        ctx.roundRect(barX + 0.5, midY - barH / 2, 2.2, barH, 1);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      accTime += blk.duration;
    });

    // 2. Center zero-crossing reference line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // 3. Synchronized Playhead Cursor
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    ctx.restore();
  }, [stem, blocks, currentTime, totalDuration, effectiveAudible]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDuration);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      data-testid={`waveform-canvas-${stem.id}`}
      className="h-14 w-full cursor-pointer rounded-lg border border-slate-800/80 bg-slate-950/90 transition-colors hover:border-slate-700"
      title={`Click anywhere on ${stem.name} waveform to scrub playhead`}
    />
  );
};

