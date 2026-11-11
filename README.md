# StageFlow Studio

**StageFlow Studio** is an all-in-one AI 6-stem separator, non-destructive block arranger for music producers, and ultra-reliable low-latency live performance rig for stage musicians.

## Architecture & Workspace Structure
- **`/backend`**: Python FastAPI service wrapping `demucs` (HTDemucs 4-to-6 stem separation) and `librosa` (automatic BPM detection, musical key estimation, beat-grid timestamps, and structural section segmentation), plus an out-of-the-box procedural multi-stem synthesizer and stereo arrangement exporter.
- **`/frontend`**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Zustand + Web Audio API / Tone.js multi-track synchronized playback engine.

## Core Modules
1. **Module A — AI Stem Ingestion & Multi-Track Mixer**:
   - Drag-and-drop audio uploader (`.mp3`, `.wav`, `.flac`).
   - Auto-detected **BPM**, **Musical Key**, and **Time Signature** in the top transport bar.
   - 6-channel Stem Mixer (**Vocals, Drums, Bass, Keys, Guitar, Backing/Other**) with per-stem Mute, Solo, Volume faders, Stereo Panning, color-coded synchronized canvas waveforms, and real-time Master Pitch Transpose (`-6` to `+6` semitones) and Tempo scaling.
2. **Module B — Producer "Stress-Free" Block Arranger View**:
   - High-level **Magnetic Section Timeline** (`Intro`, `Verse 1`, `Chorus`, `Verse 2`, `Bridge`, `Outro`).
   - Drag-and-drop or click to reorder sections, duplicate (`2x`), delete, or toggle individual stems (`V D B K G O`) on/off per section block.
   - **Export Arrangement (`.WAV`)** renders the reordered stems into a consolidated stereo mix.
3. **Module C — Musician "Live Stage Mode" View**:
   - High-contrast dark stage UI with oversized touch targets.
   - **Smart Click & Cue Generator**: Quantized Metronome Click + Web Speech API / audio voice cues (`"Chorus in 4, 3, 2, 1"`) with independent volume and output routing selector (`Main Stereo Out`, `Band IEM Split L/R`, `Dedicated IEM Bus`).
   - **Quantized Section Looper & 8 Jump Pads**: 8 large keyboard/MIDI-mappable pads (`1`–`8`) that queue quantized jumps on the next bar downbeat, plus an infinite **Loop Section (`L`)** vamp toggle.
   - **Synced Chord & Lyric Teleprompter**: Bar-by-bar chord progression and stage lyrics that automatically transpose when Master Pitch/Key is shifted.
   - **Setlist Drawer**: Queue multiple songs, reorder the setlist, and pre-load tracks into RAM for zero-dropout transitions.

