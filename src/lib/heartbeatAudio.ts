/**
 * 💓 SINTETIZADOR PROCEDURAL DE BATIMENTO CARDÍACO (WEB AUDIO API)
 * Gera a assinatura acústica e tátil realista "Lub-Dub" (sons cardíacos S1 e S2)
 * 100% offline, sem latência, sem consumo de banda e com urgência progressiva.
 */

class HeartbeatAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Toca o ciclo duplo do coração humano ("Lub-Dub"):
   * - Lub (S1): fechamento das valvas mitral e tricúspide (frequência mais baixa, ressonância mais prolongada)
   * - Dub (S2): fechamento das valvas aórtica e pulmonar (mais rápido, um pouco mais agudo)
   *
   * @param secondsRemaining segundos restantes (ex: 5, 4, 3, 2, 1) para modular a urgência
   */
  playBeat(secondsRemaining: number = 5) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Escala de urgência (1 = calma/5s, 5 = urgência extrema/1s)
    const clampedSec = Math.max(1, Math.min(5, secondsRemaining));
    const urgency = 6 - clampedSec; // 5s -> 1, 1s -> 5

    const basePitch = 1.0 + (urgency - 1) * 0.06; // de 1.0 até 1.24
    const baseVolume = 0.25 + (urgency - 1) * 0.06; // de 0.25 até 0.49
    const now = ctx.currentTime;

    // 1️⃣ LUB (som mais profundo e suave)
    this.synthesizeValve(ctx, {
      time: now,
      frequency: 56 * basePitch,
      filterCutoff: 130,
      duration: 0.11,
      peakVolume: baseVolume * 0.85,
    });

    // 2️⃣ DUB (som mais seco e agudo ~130ms após o Lub)
    const dubDelay = Math.max(0.10, 0.14 - (urgency * 0.007)); // acelera intervalo nos segundos finais
    this.synthesizeValve(ctx, {
      time: now + dubDelay,
      frequency: 78 * basePitch,
      filterCutoff: 170,
      duration: 0.08,
      peakVolume: baseVolume,
    });
  }

  private synthesizeValve(
    ctx: AudioContext,
    options: {
      time: number;
      frequency: number;
      filterCutoff: number;
      duration: number;
      peakVolume: number;
    }
  ) {
    const { time, frequency, filterCutoff, duration, peakVolume } = options;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Filtro passa-baixa para dar a ressonância corpórea/torácica
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(35, time + duration);

    // Oscilador senoidal com queda exponencial rápida de afinação
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(28, time + duration);

    // Envelope de ganho (ataque percussivo suave, decaimento rápido)
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakVolume, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

export const heartbeatAudio = new HeartbeatAudioEngine();

/**
 * 📳 Vibração háptica tátil que reproduz o duplo pulso ("Lub-Dub") no smartphone
 */
export function triggerHeartbeatHaptic(secondsRemaining: number = 5) {
  try {
    if (typeof window === 'undefined' || !('navigator' in window) || !('vibrate' in navigator)) {
      return;
    }
    const clampedSec = Math.max(1, Math.min(5, secondsRemaining));
    const urgency = 6 - clampedSec; // 1 a 5

    const lubDuration = 35 + urgency * 3; // 38ms a 50ms
    const dubDelay = 75 - urgency * 4;   // 71ms a 55ms
    const dubDuration = 45 + urgency * 4; // 49ms a 65ms

    navigator.vibrate([lubDuration, dubDelay, dubDuration]);
  } catch {
    // Silencia se o dispositivo não tiver suporte
  }
}
