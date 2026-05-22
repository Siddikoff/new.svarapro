import { useCallback, useState } from 'react';

import { STORAGE_KEYS } from '../../../constants/app';
import { TABLE_PRESETS } from '../constants';

export type TablePresetName = keyof typeof TABLE_PRESETS;

export type TablePreset = (typeof TABLE_PRESETS)[TablePresetName];

export interface UseGameSettingsResult {
  feltPreset: TablePresetName;
  setFeltPreset: (next: TablePresetName) => void;
  felt: TablePreset;
  sound: boolean;
  toggleSound: () => void;
  vibration: boolean;
  toggleVibration: () => void;
}

function readStored(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

const isPresetName = (value: string): value is TablePresetName =>
  Object.prototype.hasOwnProperty.call(TABLE_PRESETS, value);

/**
 * Persistent room settings: felt preset, sound on/off, vibration on/off.
 */
export function useGameSettings(): UseGameSettingsResult {
  const [feltPreset, setFeltPresetState] = useState<TablePresetName>(() => {
    const value = readStored(STORAGE_KEYS.tableFelt, 'green');
    return isPresetName(value) ? value : ('green' as TablePresetName);
  });
  const [sound, setSound] = useState<boolean>(
    () => readStored(STORAGE_KEYS.sound, 'on') !== 'off',
  );
  const [vibration, setVibration] = useState<boolean>(
    () => readStored(STORAGE_KEYS.vibration, 'on') !== 'off',
  );


  const setFeltPreset = useCallback((next: TablePresetName): void => {
    if (!isPresetName(next as string)) return;
    setFeltPresetState(next);
    writeStored(STORAGE_KEYS.tableFelt, next as string);
  }, []);

  const toggleSound = useCallback((): void => {
    setSound((v) => {
      const next = !v;
      writeStored(STORAGE_KEYS.sound, next ? 'on' : 'off');
      return next;
    });
  }, []);

  const toggleVibration = useCallback((): void => {
    setVibration((v) => {
      const next = !v;
      writeStored(STORAGE_KEYS.vibration, next ? 'on' : 'off');
      return next;
    });
  }, []);

  const felt = (TABLE_PRESETS[feltPreset] || TABLE_PRESETS.green) as TablePreset;

  return {
    feltPreset,
    setFeltPreset,
    felt,
    sound,
    toggleSound,
    vibration,
    toggleVibration,
  };
}
