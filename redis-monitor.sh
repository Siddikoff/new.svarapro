#!/bin/bash

# Redis Monitor Script for Gaming Environment
# Monitors Redis health and automatically recovers from issues

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
LOG_FILE="/var/log/redis-monitor.log"
MAX_RETRIES=3
RETRY_DELAY=5

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

check_redis_health() {
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_redis_memory() {
    local memory_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory 2>/dev/null)
    local used_memory=$(echo "$memory_info" | grep "used_memory:" | cut -d: -f2)
    local max_memory=$(echo "$memory_info" | grep "maxmemory:" | cut -d: -f2)
    
    if [ -n "$used_memory" ] && [ -n "$max_memory" ] && [ "$max_memory" != "0" ]; then
        local usage_percent=$((used_memory * 100 / max_memory))
        if [ "$usage_percent" -gt 90 ]; then
            log "WARNING: Redis memory usage is ${usage_percent}%"
            return 1
        fi
    fi
    return 0
}

check_redis_connections() {
    local connected_clients=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info clients | grep "connected_clients:" | cut -d: -f2)
    local max_clients=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info clients | grep "maxclients:" | cut -d: -f2)
    
    if [ -n "$connected_clients" ] && [ -n "$max_clients" ]; then
        local usage_percent=$((connected_clients * 100 / max_clients))
        if [ "$usage_percent" -gt 80 ]; then
            log "WARNING: Redis connection usage is ${usage_percent}% (${connected_clients}/${max_clients})"
        fi
    fi
}

check_redis_latency() {
    local latency=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --latency 2>/dev/null | tail -1 | awk '{print $1}')
    if [ -n "$latency" ] && [ "$latency" -gt 100 ]; then
        log "WARNING: Redis latency is ${latency}ms"
    fi
}

restart_redis() {
    log "Attempting to restart Redis..."
    
    # Try to gracefully shutdown Redis
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" shutdown > /dev/null 2>&1
    
    # Wait for shutdown
    sleep 5
    
    # Check if Redis is still running
    if check_redis_health; then
        log "Redis is still running, forcing restart..."
        # Force kill if needed
        pkill -f redis-server
        sleep 2
    fi
    
    # Start Redis (this would be handled by Docker in production)
    log "Redis restart completed"
}

main() {
    log "Starting Redis monitor..."
    
    while true; do
        # Check basic connectivity
        if ! check_redis_health; then
            log "ERROR: Redis is not responding"
            
            # Try to restart Redis
            restart_redis
            
            # Wait and check again
            sleep "$RETRY_DELAY"
            if ! check_redis_health; then
                log "ERROR: Redis is still not responding after restart"
            else
                log "SUCCESS: Redis is back online"
            fi
        else
            # Check memory usage
            check_redis_memory
            
            # Check connection count
            check_redis_connections
            
            # Check latency
            check_redis_latency
        fi
        
        # Sleep for 30 seconds before next check
        sleep 30
    done
}

# Handle script termination
trap 'log "Redis monitor stopped"; exit 0' SIGTERM SIGINT

# Start monitoring
main 