// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '../toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pushes a toast and returns a unique id', () => {
    const id1 = useToastStore.getState().pushToast({ message: 'hello' });
    const id2 = useToastStore.getState().pushToast({ message: 'world' });
    expect(id1).not.toBe(id2);
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });

  it('auto-dismisses after the duration', () => {
    useToastStore.getState().pushToast({ message: 'goes away', duration: 100 });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(150);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('does not auto-dismiss when duration is 0', () => {
    useToastStore.getState().pushToast({ message: 'sticky', duration: 0 });
    vi.advanceTimersByTime(10_000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('dismisses by id', () => {
    const id = useToastStore.getState().pushToast({ message: 'a', duration: 0 });
    useToastStore.getState().pushToast({ message: 'b', duration: 0 });
    useToastStore.getState().dismissToast(id);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['b']);
  });
});
