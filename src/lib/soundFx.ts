// soundFx.ts — Motor de Efeitos Sonoros Unificado (Web Audio API + HTMLAudio)
// Centraliza todos os efeitos sonoros de App.tsx, LocalGameMode.tsx e PlayerView.tsx

import { heartbeatAudio } from './heartbeatAudio';

export class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  
  public spinAudio: HTMLAudioElement | null = null;
  public lobbyAudio: HTMLAudioElement | null = null;
  public gameAudio: HTMLAudioElement | null = null;
  public victoryAudio: HTMLAudioElement | null = null;
  public errorAudio: HTMLAudioElement | null = null;
  public correctAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.spinAudio = new Audio('/spin.mp3');
        this.spinAudio.preload = 'auto';

        this.lobbyAudio = new Audio('/lobby.mp3');
        this.lobbyAudio.preload = 'auto';
        this.lobbyAudio.loop = true;
        this.lobbyAudio.volume = 0.4;

        this.gameAudio = new Audio('/game.mp3');
        this.gameAudio.preload = 'auto';
        this.gameAudio.loop = true;
        this.gameAudio.volume = 0.5;

        this.victoryAudio = new Audio('/victory.mp3');
        this.victoryAudio.preload = 'auto';
        this.victoryAudio.volume = 0.5;

        this.errorAudio = new Audio('/error.mp3');
        this.errorAudio.preload = 'auto';
        this.errorAudio.volume = 0.5;

        this.correctAudio = new Audio('/correct.mp3');
        this.correctAudio.preload = 'auto';
        this.correctAudio.volume = 0.5;
      } catch (e) {
        console.warn('[SoundFX] Falha ao pré-carregar arquivos de áudio:', e);
      }
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) {
      console.warn('[SoundFX] Erro ao sintetizar tom:', e);
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      this.tone(600, 0.1, 'sine', 0.1);
    }
  }

  playSpin() {
    if (!this.enabled) return;
    try {
      if (this.spinAudio) {
        this.spinAudio.currentTime = 0;
        this.spinAudio.play().catch(() => {
          const audio = new Audio('/spin.mp3');
          audio.volume = 1.0;
          audio.play().catch(() => {});
        });
      } else {
        const audio = new Audio('/spin.mp3');
        audio.volume = 1.0;
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.warn('[SoundFX] Erro ao tocar spin.mp3:', e);
    }
  }

  stopSpin() {
    if (!this.spinAudio) return;
    try {
      this.spinAudio.pause();
      this.spinAudio.currentTime = 0;
    } catch {}
  }

  playGameSound() {
    if (!this.enabled || !this.gameAudio) return;
    try {
      this.gameAudio.currentTime = 0;
      this.gameAudio.play().catch(e => console.warn('[SoundFX] Erro ao tocar game.mp3:', e));
    } catch (e) {
      console.warn('[SoundFX] Erro na música de jogo:', e);
    }
  }

  stopGameSound() {
    if (!this.gameAudio) return;
    try {
      this.gameAudio.pause();
    } catch (e) {
      console.warn('[SoundFX] Erro ao parar música de jogo:', e);
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    const playFallbackTone = () => {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        setTimeout(() => this.tone(freq, 0.2, 'sine', 0.12), idx * 80);
      });
    };

    if (this.correctAudio) {
      try {
        this.correctAudio.currentTime = 0;
        this.correctAudio.play().catch(() => playFallbackTone());
      } catch {
        playFallbackTone();
      }
    } else {
      playFallbackTone();
    }
  }

  playWrong() {
    if (!this.enabled) return;
    const playFallbackTone = () => {
      this.initCtx();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
      } catch {
        this.tone(180, 0.4, 'sawtooth', 0.12);
      }
    };

    if (this.errorAudio) {
      try {
        this.errorAudio.currentTime = 0;
        this.errorAudio.play().catch(() => playFallbackTone());
      } catch {
        playFallbackTone();
      }
    } else {
      playFallbackTone();
    }
  }

  playTimeout() {
    if (!this.enabled) return;
    this.tone(120, 0.6, 'sawtooth', 0.12);
  }

  playHeartbeat(sec: number) {
    if (!this.enabled) return;
    heartbeatAudio.enabled = this.enabled;
    heartbeatAudio.playBeat(sec);
  }

  playDrumRoll() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 segundos
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 2.0);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {
      console.warn('[SoundFX] Erro ao tocar drum roll:', e);
    }
  }

  playLobby() {
    if (!this.enabled || !this.lobbyAudio) return;
    this.lobbyAudio.currentTime = 0;
    this.lobbyAudio.play().catch(e => console.warn('[SoundFX] Erro ao tocar lobby.mp3:', e));
  }

  stopLobby() {
    if (!this.lobbyAudio) return;
    try {
      this.lobbyAudio.pause();
      this.lobbyAudio.currentTime = 0;
    } catch {}
  }

  playVictory() {
    if (!this.enabled) return;
    if (this.victoryAudio) {
      try {
        this.victoryAudio.currentTime = 0;
        this.victoryAudio.play().catch(() => {
          const audio = new Audio('/victory.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        });
      } catch {
        const audio = new Audio('/victory.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    } else {
      const audio = new Audio('/victory.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }

  stopVictory() {
    if (!this.victoryAudio) return;
    try {
      this.victoryAudio.pause();
      this.victoryAudio.currentTime = 0;
    } catch {}
  }

  stopAll() {
    this.stopSpin();
    this.stopGameSound();
    this.stopLobby();
    this.stopVictory();
    if (this.errorAudio) {
      try { this.errorAudio.pause(); this.errorAudio.currentTime = 0; } catch {}
    }
    if (this.correctAudio) {
      try { this.correctAudio.pause(); this.correctAudio.currentTime = 0; } catch {}
    }
  }
}

export const sfx = new SoundFX();
