// useGameAudio.ts — Hook customizado para controle de áudio e efeitos sonoros
import { useState, useCallback, useEffect } from 'react';
import { sfx, SoundFX } from '../lib/soundFx';

export function useGameAudio(initialEnabled: boolean = true) {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('quizziando_sound_enabled');
      if (stored !== null) return stored === 'true';
    }
    return initialEnabled;
  });

  // Manter sfx.enabled sincronizado com o estado
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    sfx.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizziando_sound_enabled', String(enabled));
    }
    if (!enabled) {
      sfx.stopAll();
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!sfx.enabled);
  }, [setSoundEnabled]);

  const playClick = useCallback(() => sfx.playClick(), []);
  const playCorrect = useCallback(() => sfx.playCorrect(), []);
  const playWrong = useCallback(() => sfx.playWrong(), []);
  const playTimeout = useCallback(() => sfx.playTimeout(), []);
  const playHeartbeat = useCallback((sec: number) => sfx.playHeartbeat(sec), []);
  const playSpin = useCallback(() => sfx.playSpin(), []);
  const stopSpin = useCallback(() => sfx.stopSpin(), []);
  const playGameSound = useCallback(() => sfx.playGameSound(), []);
  const stopGameSound = useCallback(() => sfx.stopGameSound(), []);
  const playLobby = useCallback(() => sfx.playLobby(), []);
  const stopLobby = useCallback(() => sfx.stopLobby(), []);
  const playVictory = useCallback(() => sfx.playVictory(), []);
  const playDrumRoll = useCallback(() => sfx.playDrumRoll(), []);
  const stopAll = useCallback(() => sfx.stopAll(), []);

  return {
    sfx,
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    playClick,
    playCorrect,
    playWrong,
    playTimeout,
    playHeartbeat,
    playSpin,
    stopSpin,
    playGameSound,
    stopGameSound,
    playLobby,
    stopLobby,
    playVictory,
    playDrumRoll,
    stopAll
  };
}

export { sfx, SoundFX };
