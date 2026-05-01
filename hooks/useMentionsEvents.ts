"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { 
  RealtimeSnapshot, 
  ConnectionStatus, 
  UseMentionsEventsReturn,
  ReconnectionConfig,
  DashboardError 
} from "../types/dashboard";

const EMPTY_SNAPSHOT: RealtimeSnapshot = {
  totalMentions: 0,
  totalAnalyzed: 0,
  averageSentiment: "N/A",
  sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
  recentTweets: [],
  lastUpdate: null,
};

const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
};

function calculateBackoffDelay(attempt: number, config: ReconnectionConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

function createError(message: string, code: string): DashboardError {
  return {
    code,
    message,
    timestamp: new Date().toISOString(),
    recoverable: true,
  };
}

export function useMentionsEvents(brand?: string): UseMentionsEventsReturn {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot>(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<ReconnectionConfig>(DEFAULT_RECONNECTION_CONFIG);

  const query = useMemo(() => {
    if (!brand || brand.trim().length === 0) {
      return "";
    }
    return `?brand=${encodeURIComponent(brand)}`;
  }, [brand]);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback((attempt: number = 1) => {
    cleanup();
    
    if (attempt > configRef.current.maxAttempts) {
      setStatus("error");
      setLastError(createError(
        "Maximum reconnection attempts reached",
        "MAX_RECONNECT_ATTEMPTS"
      ).message);
      return;
    }

    setStatus("connecting");
    setReconnectAttempts(attempt);

    try {
      const source = new EventSource(`/api/events/mentions${query}`);
      eventSourceRef.current = source;

      source.onopen = () => {
        console.log(`SSE connection opened (attempt ${attempt})`);
        setStatus("connected");
        setReconnectAttempts(0);
        setLastError(null);
        
        // Reset heartbeat timeout
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        
        // Set heartbeat timeout (30 seconds without heartbeat = reconnect)
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("Heartbeat timeout, reconnecting...");
          source.close();
          connect(attempt + 1);
        }, 30000);
      };

      source.onerror = (event) => {
        console.error("SSE error:", event);
        cleanup();
        
        const delay = calculateBackoffDelay(attempt, configRef.current);
        console.log(`Reconnecting in ${delay}ms (attempt ${attempt})`);
        
        setStatus("reconnecting");
        setLastError(createError(
          `Connection lost, reconnecting in ${Math.round(delay / 1000)}s`,
          "CONNECTION_LOST"
        ).message);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect(attempt + 1);
        }, delay);
      };

      source.addEventListener("snapshot", (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeSnapshot;
          setSnapshot(parsed);
          
          // Reset heartbeat timeout on data received
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
          }
          heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn("Heartbeat timeout, reconnecting...");
            source.close();
            connect(attempt + 1);
          }, 30000);
        } catch (error) {
          console.error("Error parsing snapshot data:", error);
          setLastError(createError(
            "Failed to parse snapshot data",
            "PARSE_ERROR"
          ).message);
        }
      });

      source.addEventListener("heartbeat", (event) => {
        // Reset heartbeat timeout
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("Heartbeat timeout, reconnecting...");
          source.close();
          connect(attempt + 1);
        }, 30000);
      });

      source.addEventListener("error", (event) => {
        try {
          // EventSource error events don't have data property
          // This handles connection errors
          console.error("EventSource error event:", event);
          setLastError(createError(
            "Connection error occurred",
            "EVENTSOURCE_ERROR"
          ).message);
        } catch (parseError) {
          console.error("Error handling error event:", parseError);
        }
      });

    } catch (error) {
      console.error("Failed to create EventSource:", error);
      setLastError(createError(
        "Failed to establish connection",
        "CONNECTION_FAILED"
      ).message);
      
      const delay = calculateBackoffDelay(attempt, configRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(attempt + 1);
      }, delay);
    }
  }, [query, cleanup]);

  useEffect(() => {
    connect(1);
    
    return cleanup;
  }, [query, connect, cleanup]);

  return {
    snapshot,
    status,
    reconnectAttempts,
    lastError,
  };
}
