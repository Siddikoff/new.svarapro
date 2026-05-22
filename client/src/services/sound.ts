import { STORAGE_KEYS } from '../constants/app';

type SoundStep = [number, number];
type SoundPresetName = 'success' | 'tap';

const SOUND_PRESETS: Record<SoundPresetName, SoundStep[]> = {
  success: [
    [880, 0],
    [1320, 0.1],
    [1760, 0.2],
  ],
  tap: [[700, 0]],
};

const soundDisabled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEYS.sound) === 'off';
  } catch {
    return false;
  }
};

type AudioContextCtor = typeof AudioContext;

const createAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctx: AudioContextCtor | undefined =
    window.AudioContext ?? (window as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return Ctx ? new Ctx() : null;
};

export const playSound = (presetName: SoundPresetName | string): void => {
  if (soundDisabled()) return;
  const preset =
    SOUND_PRESETS[presetName as SoundPresetName] ?? SOUND_PRESETS.tap;
  const ctx = createAudioContext();
  if (!ctx) return;

  preset.forEach(([frequency, startOffset]) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const startTime = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.2);
  });

  setTimeout(() => {
    try {
      ctx.close();
    } catch {
      // ignore
    }
  }, 700);
};
