#!/bin/bash

echo "🧹 Cleaning up old nginx logs..."

# Очищаем логи старше 30 дней
find /var/log/nginx -name "*.log.*" -mtime +30 -delete

# Очищаем сжатые логи старше 7 дней
find /var/log/nginx -name "*.gz" -mtime +7 -delete

# Показываем текущий размер логов
echo "📊 Current log sizes:"
du -sh /var/log/nginx/*.log 2>/dev/null || echo "No log files found"

echo "✅ Log cleanup completed!" 