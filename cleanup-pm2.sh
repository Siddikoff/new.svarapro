#!/bin/bash

echo "Cleaning up PM2 processes..."

# Останавливаем все процессы PM2
pm2 stop all 2>/dev/null || true

# Удаляем все процессы PM2
pm2 delete all 2>/dev/null || true

# Очищаем логи PM2
pm2 flush 2>/dev/null || true

# Убиваем все процессы node, если они остались
pkill -f "node.*main.js" 2>/dev/null || true
pkill -f "pm2" 2>/dev/null || true

echo "PM2 cleanup completed." 