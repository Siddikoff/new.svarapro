import React, { type ErrorInfo, type ReactNode } from 'react';

import { BRAND } from '../designSystem';
import styles from './ErrorBoundary.module.css';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary.
 *
 * Without this, any uncaught render error in any screen / modal would unmount
 * the entire React tree and leave the user with a blank Telegram WebView
 * (which they can't even refresh easily). Wrapping the app in a boundary
 * means the worst case is a small "что-то пошло не так" card with a reload
 * button — much better than a silent white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the original stack visible in the Telegram WebApp console / dev
    // tools so we can still investigate after the fallback renders.
    // eslint-disable-next-line no-console
    console.error('Unhandled error in React tree:', error, info);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className={styles.root}>
        <div className={styles.card}>
          <div className={styles.iconWrap} aria-hidden="true" style={{ color: BRAND.red }}>
            !
          </div>
          <div className={styles.title}>Что-то пошло не так</div>
          <div className={styles.body}>
            Произошла непредвиденная ошибка. Попробуйте перезагрузить приложение — если ошибка
            повторится, напишите в поддержку.
          </div>
          <button type="button" onClick={this.handleReload} className={styles.reloadBtn}>
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}
