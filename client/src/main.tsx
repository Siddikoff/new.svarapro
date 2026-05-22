import './i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

try {
  const tg = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready?.();
    tg.expand?.();
  }
} catch {
  /* ignore */
}

// The svarapro backend exposes its realtime API over socket.io — see
// `services/socket.ts` for the live client wiring. The previous raw-WebSocket
// bridge from `src/websocket/` has been removed (it pointed at an endpoint
// that doesn't exist on the server and would have collided with the socket.io
// transport once `VITE_WS_URL` was set).


const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
