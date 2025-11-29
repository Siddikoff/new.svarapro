import { io, Socket } from 'socket.io-client';
import { UserData } from '@/types/entities';

export const initSocket = (telegramId?: string, userData?: UserData): Socket => {
  const defaultTelegramId =
    window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || '';
  const defaultUserData = {
    username:
      window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'Unknown',
    avatar: window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url || '',
  };



  const socket = io('https://svarapro.com', {
    withCredentials: true,
    transports: ['websocket'],
    auth: {
      telegramId: telegramId || defaultTelegramId,
      userData: userData || defaultUserData,
    },
    reconnection: true, // Явно включаем реконнект
    reconnectionAttempts: 10, // Увеличиваем количество попыток
    reconnectionDelay: 2000, // Задержка между попытками
  });

  socket.on('connect', () => {
    socket.emit('request_rooms');
    // Добавляем обработчики для баланса
    socket.emit('join', telegramId || defaultTelegramId);
    socket.emit('subscribe_balance', telegramId || defaultTelegramId);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('WebSocket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('WebSocket reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error('WebSocket reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('WebSocket reconnection failed');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Добавляем обработчики для баланса
  socket.on('transactionConfirmed', (data: { balance: string; message: string }) => {
    // Эмитим событие для App.tsx
    window.dispatchEvent(new CustomEvent('balanceUpdated', { 
      detail: { balance: data.balance, message: data.message } 
    }));
  });

  socket.on('balanceUpdated', (data: { balance: string }) => {
    // Эмитим событие для App.tsx
    window.dispatchEvent(new CustomEvent('balanceUpdated', { 
      detail: { balance: data.balance } 
    }));
  });

  // --- Логика восстановления соединения при возвращении в приложение ---
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !socket.connected) {
      socket.connect();
    }
  };

  // Убираем старый обработчик, если он был, и добавляем новый
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return socket;
};
