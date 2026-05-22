import { useEffect, useState } from 'react';

import { BRAND } from '../designSystem';
import styles from './ConnectionStatus.module.css';

const PROBE_URL = '/index.html';
const PROBE_INTERVAL_MS = 6000;
const PROBE_TIMEOUT_MS = 4000;
const FAIL_THRESHOLD = 2;

function useOffline() {
  const [navOnline, setNavOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false,
  );
  const [probeFails, setProbeFails] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onUp = () => setNavOnline(true);
    const onDown = () => setNavOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    let cancelled = false;
    const probe = async () => {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), PROBE_TIMEOUT_MS) : null;
      try {
        await fetch(`${PROBE_URL}?_=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
          signal: ctl ? ctl.signal : undefined,
        });
        if (timer) clearTimeout(timer);
        if (!cancelled) setProbeFails(0);
      } catch {
        if (timer) clearTimeout(timer);
        if (!cancelled) setProbeFails((n) => Math.min(n + 1, 99));
      }
    };
    probe();
    const iv = setInterval(probe, PROBE_INTERVAL_MS);
    const onUp = () => {
      setProbeFails(0);
      probe();
    };
    window.addEventListener('online', onUp);
    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener('online', onUp);
    };
  }, []);

  return !navOnline || probeFails >= FAIL_THRESHOLD;
}

const RED = BRAND.red;

export function ConnectionStatus() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Нет подключения"
      className={styles.overlay}
    >
      <div className={styles.card}>
        <div className={styles.iconCircle}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 64 64"
            fill="none"
            stroke={RED}
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path className="svr-wifi-arc svr-wifi-arc-3" d="M8 24c14-14 34-14 48 0" />
            <path className="svr-wifi-arc svr-wifi-arc-2" d="M16 32c9-9 23-9 32 0" />
            <path className="svr-wifi-arc svr-wifi-arc-1" d="M24 40c4.5-4.5 11.5-4.5 16 0" />
            <circle cx="32" cy="50" r="3" fill={RED} stroke="none" />
            <line
              className="svr-wifi-slash"
              x1="12"
              y1="14"
              x2="52"
              y2="54"
              stroke={RED}
              strokeWidth="4.2"
            />
          </svg>
        </div>
        <div className={styles.title}>Нет подключения</div>
        <div className={styles.sub}>
          Проверьте интернет — мы восстановим соединение автоматически.
        </div>
        <div className={styles.statusRow} style={{ color: RED }}>
          <span className={styles.statusDot} style={{ background: RED }} />
          <span className={styles.statusText}>
            Подключение
            <span className={styles.dotsBox}>
              <span className="svr-conn-dot">.</span>
              <span className="svr-conn-dot">.</span>
              <span className="svr-conn-dot">.</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
