// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from '../../store/toastStore';
import { ToastViewport } from '../ToastViewport';

describe('ToastViewport', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    cleanup();
    useToastStore.getState().clearToasts();
  });

  it('renders nothing when the toast list is empty', () => {
    const { container } = render(<ToastViewport />);
    expect(container.firstChild).toBeNull();
  });

  it('renders each toast in order with its message visible', () => {
    useToastStore.getState().pushToast({ message: 'first', duration: 0 });
    useToastStore.getState().pushToast({ message: 'second', tone: 'error', duration: 0 });
    render(<ToastViewport />);
    expect(screen.getByText('first')).toBeTruthy();
    expect(screen.getByText('second')).toBeTruthy();
  });

  it('dismisses a toast when the user clicks it', () => {
    useToastStore.getState().pushToast({ message: 'click-me', duration: 0 });
    render(<ToastViewport />);
    const node = screen.getByText('click-me').parentElement;
    if (!node) throw new Error('toast element missing');
    node.click();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
