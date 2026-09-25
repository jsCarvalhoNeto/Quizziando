import test from 'node:test';
import assert from 'node:assert/strict';
import { heartbeatAudio, triggerHeartbeatHaptic } from '../src/lib/heartbeatAudio.ts';

test('heartbeatAudio não lança exceção em ambiente sem AudioContext (SSR ou Node)', () => {
  assert.equal(heartbeatAudio.enabled, true);
  // Não deve lançar erro mesmo sem window/AudioContext
  assert.doesNotThrow(() => {
    heartbeatAudio.playBeat(5);
    heartbeatAudio.playBeat(1);
  });
});

test('triggerHeartbeatHaptic dispara vibração adaptativa conforme os segundos restantes', () => {
  let capturedPattern: number[] | null = null;
  (globalThis as any).window = globalThis;
  
  const originalVibrate = (globalThis.navigator as any)?.vibrate;
  Object.defineProperty(globalThis.navigator, 'vibrate', {
    value: (pattern: number[]) => {
      capturedPattern = pattern;
      return true;
    },
    configurable: true,
    writable: true,
  });

  // No segundo 5 (calmo)
  triggerHeartbeatHaptic(5);
  assert.ok(capturedPattern);
  assert.equal(capturedPattern[0], 38); // 35 + 1*3
  assert.equal(capturedPattern[1], 71); // 75 - 1*4
  assert.equal(capturedPattern[2], 49); // 45 + 1*4

  // No segundo 1 (urgência máxima)
  triggerHeartbeatHaptic(1);
  assert.equal(capturedPattern[0], 50); // 35 + 5*3
  assert.equal(capturedPattern[1], 55); // 75 - 5*4
  assert.equal(capturedPattern[2], 65); // 45 + 5*4

  // Limpeza
  if (originalVibrate) {
    Object.defineProperty(globalThis.navigator, 'vibrate', { value: originalVibrate, configurable: true, writable: true });
  } else {
    delete (globalThis.navigator as any).vibrate;
  }
  delete (globalThis as any).window;
});
