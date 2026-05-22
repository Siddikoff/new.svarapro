import './i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { attachStoreBridge, wsClient } from './websocket';

try {
  const tg = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready?.();
    tg.expand?.();
  }
} catch {
  /* ignore */
}

// Wire the WebSocket bridge to the zustand stores. With no `VITE_WS_URL`
// configured this is a no-op (connect() returns early); once the backend is
// live the UI reacts to server pushes with zero extra glue in components.
attachStoreBridge();
wsClient.connect();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
