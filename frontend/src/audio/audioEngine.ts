import { ClickRoutingMode, SectionBlock, SongPayload, StemId, StemTrack } from '../types/stageflow';

type EngineTickCallback = (state: {
  currentTime: number;
  currentBar: number;
  currentBeat: number;
  currentSixteenth: number;
  activeBlockIndex: number;
  queuedBlockIndex: number | null;
  lastVoiceCue?: string;
}) => void;

const STEM_IDS: StemId[] = ['vocals', 'drums', 'bass', 'keys', 'guitar', 'other'];

class StageFlowAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterPanner: StereoPannerNode | null = null;

  // Per-stem audio nodes
  private stemGains: Record<StemId, GainNode | null> = {
    vocals: null,
    drums: null,
    bass: null,
    keys: null,
    guitar: null,
    other: null,
  };
  private stemPanners: Record<StemId, StereoPannerNode | null> = {
    vocals: null,
    drums: null,
    bass: null,
    keys: null,
    guitar: null,
    other: null,
  };
  private activeSources: Record<StemId, AudioBufferSourceNode | null> = {
    vocals: null,
    drums: null,
    bass: null,
    keys: null,
    guitar: null,
    other: null,
  };

  // Preloaded song buffers: songId -> stemId -> AudioBuffer
  private bufferCache: Map<string, Record<StemId, AudioBuffer>> = new Map();

  // Playback state
  private isPlaying = false;
  private rafId: number | null = null;
  private lastFrameTimestamp = 0;

  // Arrangement timeline tracking
  private currentSong: SongPayload | null = null;
  private blocks: SectionBlock[] = [];
  private stems: StemTrack[] = [];
  private activeBlockIndex = 0;
  private blockElapsedSeconds = 0; // Elapsed within active block (in scaled song time)
  private queuedBlockIndex: number | null = null;
  private isLoopingSection = false;

  // Master parameters
  private pitchSemitones = 0;
  private tempoScale = 1.0;
  private masterVolume = 0.9;

  // Smart Click & Cue parameters
  private clickEnabled = true;
  private clickVolume = 0.75;
  private voiceCuesEnabled = true;
  private cueVolume = 0.85;
  private clickRouting: ClickRoutingMode = 'main';
  private lastTriggeredBeatKey = '';
  private lastAnnouncedTransitionKey = '';

  private onTick: EngineTickCallback | null = null;

  public setTickCallback(cb: EngineTickCallback) {
    this.onTick = cb;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterPanner = this.ctx.createStereoPanner();
      this.masterGain.gain.value = this.masterVolume;

      this.masterGain.connect(this.masterPanner);
      this.masterPanner.connect(this.ctx.destination);

      for (const id of STEM_IDS) {
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        gain.connect(panner);
        panner.connect(this.masterGain);
        this.stemGains[id] = gain;
        this.stemPanners[id] = panner;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async preloadSong(song: SongPayload): Promise<boolean> {
    if (this.bufferCache.has(song.id)) {
      return true;
    }
    const ctx = this.ensureContext();
    const record = {} as Record<StemId, AudioBuffer>;

    await Promise.all(
      song.stems.map(async (stem) => {
        try {
          const res = await fetch(stem.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuf);
          record[stem.id] = decoded;
        } catch {
          // Instant procedural fallback buffer so audio never fails even offline
          record[stem.id] = this.createFallbackStemBuffer(ctx, song.duration || 48, stem.id);
        }
      })
    );

    this.bufferCache.set(song.id, record);
    return true;
  }

  private createFallbackStemBuffer(ctx: AudioContext, duration: number, stemId: StemId): AudioBuffer {
    const sr = ctx.sampleRate;
    const len = Math.max(sr * 4, Math.floor(duration * sr));
    const buf = ctx.createBuffer(2, len, sr);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);
    const baseFreqMap: Record<StemId, number> = {
      vocals: 523.25,
      drums: 110.0,
      bass: 65.41,
      keys: 261.63,
      guitar: 392.0,
      other: 659.25,
    };
    const freq = baseFreqMap[stemId] || 261.63;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-((t % 0.5) * 6.0));
      const sample = Math.sin(2 * Math.PI * freq * t) * 0.2 * env;
      left[i] = sample;
      right[i] = sample;
    }
    return buf;
  }

  public syncState(params: {
    song: SongPayload;
    blocks: SectionBlock[];
    stems: StemTrack[];
    pitchSemitones: number;
    tempoScale: number;
    masterVolume: number;
    isLoopingSection: boolean;
    clickEnabled: boolean;
    clickVolume: number;
    voiceCuesEnabled: boolean;
    cueVolume: number;
    clickRouting: ClickRoutingMode;
  }) {
    const songChanged = this.currentSong?.id !== params.song.id;
    const pitchChanged = this.pitchSemitones !== params.pitchSemitones;
    const tempoChanged = Math.abs(this.tempoScale - params.tempoScale) > 0.001;

    this.currentSong = params.song;
    this.blocks = params.blocks;
    this.stems = params.stems;
    this.pitchSemitones = params.pitchSemitones;
    this.tempoScale = params.tempoScale;
    this.masterVolume = params.masterVolume;
    this.isLoopingSection = params.isLoopingSection;
    this.clickEnabled = params.clickEnabled;
    this.clickVolume = params.clickVolume;
    this.voiceCuesEnabled = params.voiceCuesEnabled;
    this.cueVolume = params.cueVolume;
    this.clickRouting = params.clickRouting;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.015);
    }
    if (this.masterPanner && this.ctx) {
      // In IEM Split mode: Main Stems pan hard right (+0.85), Click/Cues pan hard left (-0.85)
      const mainPan = this.clickRouting === 'iem_split' ? 0.85 : 0.0;
      this.masterPanner.pan.setTargetAtTime(mainPan, this.ctx.currentTime, 0.015);
    }

    this.updateStemMixerGains();

    if (this.isPlaying && (pitchChanged || tempoChanged)) {
      this.updateActiveSourcesPitchAndRate();
    }

    if (songChanged) {
      this.preloadSong(params.song);
    }
  }

  private updateStemMixerGains() {
    if (!this.ctx) return;
    const anySolo = this.stems.some((s) => s.soloed);
    const currentBlock = this.blocks[this.activeBlockIndex];

    for (const stem of this.stems) {
      const gainNode = this.stemGains[stem.id];
      const panNode = this.stemPanners[stem.id];
      if (!gainNode || !panNode) continue;

      const activeInBlock = currentBlock ? (currentBlock.activeStems?.[stem.id] ?? true) : true;
      const audible = activeInBlock && !stem.muted && (!anySolo || stem.soloed);
      const targetGain = audible ? stem.volume : 0.0;

      gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.018);
      panNode.pan.setTargetAtTime(stem.pan, this.ctx.currentTime, 0.018);
    }
  }

  private updateActiveSourcesPitchAndRate() {
    if (!this.ctx) return;
    for (const id of STEM_IDS) {
      const src = this.activeSources[id];
      if (src) {
        try {
          src.playbackRate.setTargetAtTime(this.tempoScale, this.ctx.currentTime, 0.01);
          // Detune in cents for pitch shifting (-600 to +600 cents)
          src.detune.setTargetAtTime(this.pitchSemitones * 100, this.ctx.currentTime, 0.01);
        } catch {
          // Ignore if node already ended
        }
      }
    }
  }

  private startSourcesForCurrentBlock(offsetWithinBlockSeconds: number) {
    this.stopActiveSources();
    if (!this.ctx || !this.currentSong) return;

    const block = this.blocks[this.activeBlockIndex];
    if (!block) return;

    const songBuffers = this.bufferCache.get(this.currentSong.id);
    if (!songBuffers) {
      this.preloadSong(this.currentSong).then(() => {
        if (this.isPlaying) {
          this.startSourcesForCurrentBlock(this.blockElapsedSeconds);
        }
      });
      return;
    }

    const sourceOffset = Math.max(0, block.startTime + offsetWithinBlockSeconds);
    const remainingBlockDuration = Math.max(0.05, (block.duration - offsetWithinBlockSeconds) / this.tempoScale);

    for (const id of STEM_IDS) {
      const buf = songBuffers[id];
      const stemGain = this.stemGains[id];
      if (!buf || !stemGain) continue;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = this.tempoScale;
      src.detune.value = this.pitchSemitones * 100;
      src.connect(stemGain);

      const safeOffset = Math.min(sourceOffset, Math.max(0, buf.duration - 0.05));
      try {
        src.start(0, safeOffset, remainingBlockDuration + 0.25);
        this.activeSources[id] = src;
      } catch {
        // Ignore out of bounds
      }
    }

    this.updateStemMixerGains();
  }

  private stopActiveSources() {
    for (const id of STEM_IDS) {
      const src = this.activeSources[id];
      if (src) {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Already stopped
        }
        this.activeSources[id] = null;
      }
    }
  }

  public async play() {
    if (!this.currentSong) return;
    this.ensureContext();
    await this.preloadSong(this.currentSong);

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTimestamp = performance.now();
    this.lastTriggeredBeatKey = '';

    this.startSourcesForCurrentBlock(this.blockElapsedSeconds);
    this.scheduleFrame();
  }

  public pause() {
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.stopActiveSources();
  }

  public stop() {
    this.pause();
    this.activeBlockIndex = 0;
    this.blockElapsedSeconds = 0;
    this.queuedBlockIndex = null;
    this.lastTriggeredBeatKey = '';
    this.emitTick();
  }

  public seekToTimelineTime(timelineSeconds: number) {
    if (!this.blocks.length) return;
    let accumulated = 0;
    let targetIdx = 0;
    let offsetInBlock = 0;

    for (let i = 0; i < this.blocks.length; i++) {
      const bDur = this.blocks[i].duration;
      if (timelineSeconds < accumulated + bDur || i === this.blocks.length - 1) {
        targetIdx = i;
        offsetInBlock = Math.max(0, Math.min(bDur - 0.01, timelineSeconds - accumulated));
        break;
      }
      accumulated += bDur;
    }

    this.activeBlockIndex = targetIdx;
    this.blockElapsedSeconds = offsetInBlock;
    this.lastTriggeredBeatKey = '';

    if (this.isPlaying) {
      this.startSourcesForCurrentBlock(this.blockElapsedSeconds);
    }
    this.emitTick();
  }

  public triggerSectionPad(blockIndex: number, immediateIfPaused = true): string | undefined {
    if (blockIndex < 0 || blockIndex >= this.blocks.length) return undefined;
    const targetBlock = this.blocks[blockIndex];

    if (!this.isPlaying && immediateIfPaused) {
      this.activeBlockIndex = blockIndex;
      this.blockElapsedSeconds = 0;
      this.queuedBlockIndex = null;
      const cueMsg = `READY: ${targetBlock.label.toUpperCase()} (BAR ${targetBlock.startBar})`;
      this.emitTick(cueMsg);
      return cueMsg;
    }

    // While playing: arm quantized jump for the next bar downbeat!
    this.queuedBlockIndex = blockIndex;
    const cueMsg = `QUEUED NEXT BAR: ${targetBlock.label.toUpperCase()} — IN 4, 3, 2, 1`;
    this.speakVoiceCue(`${targetBlock.label} in 4, 3, 2, 1`);
    this.emitTick(cueMsg);
    return cueMsg;
  }

  public triggerSynthesizedClick(isDownbeat: boolean) {
    if (!this.clickEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    const clickPanner = this.ctx.createStereoPanner();

    // Downbeat (Beat 1) = high studio woodblock/ping (1050 Hz); Beats 2-4 = 700 Hz
    osc.type = isDownbeat ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1050 : 700, now);
    osc.frequency.exponentialRampToValueAtTime(isDownbeat ? 520 : 360, now + 0.045);

    const peakGain = Math.min(1.0, this.clickVolume * (isDownbeat ? 0.55 : 0.35));
    clickGain.gain.setValueAtTime(peakGain, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    // Routing: IEM split routes Click/Cue to Left (-0.9), Dedicated IEM to Left (-0.6), Main to Center (0.0)
    clickPanner.pan.value =
      this.clickRouting === 'iem_split' ? -0.9 : this.clickRouting === 'dedicated_iem' ? -0.5 : 0.0;

    osc.connect(clickGain);
    clickGain.connect(clickPanner);
    clickPanner.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public speakVoiceCue(text: string) {
    if (!this.voiceCuesEnabled) return;

    // Subtle cue chime so audio cue is audible even if browser TTS is muted
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.09);
      gain.gain.setValueAtTime(this.cueVolume * 0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.25;
        utter.pitch = 1.05;
        utter.volume = Math.min(1.0, Math.max(0.1, this.cueVolume));
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore TTS restrictions
      }
    }
  }

  private scheduleFrame = () => {
    if (!this.isPlaying) return;
    const now = performance.now();
    const dtReal = (now - this.lastFrameTimestamp) / 1000;
    this.lastFrameTimestamp = now;

    if (!this.currentSong || !this.blocks.length) {
      this.rafId = requestAnimationFrame(this.scheduleFrame);
      return;
    }

    const bpm = this.currentSong.bpm || 120;
    const beatDur = 60.0 / bpm;
    const barDur = beatDur * 4.0;

    const prevElapsed = this.blockElapsedSeconds;
    const prevBarInBlock = Math.floor(prevElapsed / barDur);

    // Advance block elapsed time scaled by tempoScale
    this.blockElapsedSeconds += dtReal * this.tempoScale;
    const currentBlock = this.blocks[this.activeBlockIndex];
    const newBarInBlock = Math.floor(this.blockElapsedSeconds / barDur);

    let cueAnnouncement: string | undefined;

    // 1. Check if we crossed a bar boundary while a Quantized Jump Pad is queued!
    if (this.queuedBlockIndex !== null && newBarInBlock > prevBarInBlock) {
      const targetIdx = this.queuedBlockIndex;
      this.queuedBlockIndex = null;
      this.activeBlockIndex = targetIdx;
      this.blockElapsedSeconds = 0;
      this.startSourcesForCurrentBlock(0);
      const jumpedBlock = this.blocks[this.activeBlockIndex];
      if (jumpedBlock) {
        cueAnnouncement = `LIVE IN: ${jumpedBlock.label.toUpperCase()}`;
      }
    } else if (currentBlock && this.blockElapsedSeconds >= currentBlock.duration) {
      // 2. End of current section block reached
      if (this.isLoopingSection) {
        this.blockElapsedSeconds = 0;
        this.startSourcesForCurrentBlock(0);
        cueAnnouncement = `LOOPING: ${currentBlock.label.toUpperCase()}`;
        this.speakVoiceCue(`Looping ${currentBlock.label}`);
      } else {
        const nextIdx = (this.activeBlockIndex + 1) % this.blocks.length;
        this.activeBlockIndex = nextIdx;
        this.blockElapsedSeconds = 0;
        this.startSourcesForCurrentBlock(0);
        const nextBlock = this.blocks[this.activeBlockIndex];
        if (nextBlock) {
          cueAnnouncement = `NOW PLAYING: ${nextBlock.label.toUpperCase()}`;
        }
      }
    }

    // 3. Calculate current Bar, Beat (1..4), Sixteenth (1..4)
    const activeBlk = this.blocks[this.activeBlockIndex];
    if (activeBlk) {
      const beatInBlock = Math.floor(this.blockElapsedSeconds / beatDur);
      const beatInBar = (beatInBlock % 4) + 1;
      const barInBlock = Math.floor(this.blockElapsedSeconds / barDur);
      const beatKey = `${this.activeBlockIndex}-${barInBlock}-${beatInBar}`;

      if (beatKey !== this.lastTriggeredBeatKey) {
        this.lastTriggeredBeatKey = beatKey;
        this.triggerSynthesizedClick(beatInBar === 1);

        // If on the final bar of a section (and not looping), announce the upcoming section on Beat 1!
        const isLastBarOfBlock = barInBlock === Math.max(0, activeBlk.lengthBars - 1);
        if (isLastBarOfBlock && beatInBar === 1 && !this.isLoopingSection && this.queuedBlockIndex === null) {
          const upcomingIdx = (this.activeBlockIndex + 1) % this.blocks.length;
          const upcomingBlk = this.blocks[upcomingIdx];
          const transKey = `${this.activeBlockIndex}->${upcomingIdx}-${barInBlock}`;
          if (upcomingBlk && this.lastAnnouncedTransitionKey !== transKey) {
            this.lastAnnouncedTransitionKey = transKey;
            cueAnnouncement = `${upcomingBlk.label.toUpperCase()} IN 4, 3, 2, 1`;
            this.speakVoiceCue(`${upcomingBlk.label} in 4, 3, 2, 1`);
          }
        }
      }
    }

    this.emitTick(cueAnnouncement);
    this.rafId = requestAnimationFrame(this.scheduleFrame);
  };

  private emitTick(voiceCueOverride?: string) {
    if (!this.onTick || !this.currentSong || !this.blocks.length) return;

    const bpm = this.currentSong.bpm || 120;
    const beatDur = 60.0 / bpm;
    const barDur = beatDur * 4.0;

    let timelineTime = 0;
    let barsBefore = 0;
    for (let i = 0; i < this.activeBlockIndex; i++) {
      if (this.blocks[i]) {
        timelineTime += this.blocks[i].duration;
        barsBefore += this.blocks[i].lengthBars;
      }
    }
    timelineTime += this.blockElapsedSeconds;

    const barInBlock = Math.floor(this.blockElapsedSeconds / barDur);
    const currentBar = barsBefore + barInBlock + 1;
    const beatFloat = (this.blockElapsedSeconds % barDur) / beatDur;
    const currentBeat = Math.min(4, Math.floor(beatFloat) + 1);
    const currentSixteenth = Math.min(4, Math.floor((beatFloat % 1) * 4) + 1);

    this.onTick({
      currentTime: timelineTime,
      currentBar,
      currentBeat,
      currentSixteenth,
      activeBlockIndex: this.activeBlockIndex,
      queuedBlockIndex: this.queuedBlockIndex,
      lastVoiceCue: voiceCueOverride,
    });
  }
}

export const audioEngine = new StageFlowAudioEngine();

