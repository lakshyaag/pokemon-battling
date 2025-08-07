import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClientMessage, ServerMessage } from '../types';

interface UseWebSocketOptions {
  onMessage?: (message: ServerMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const optionsRef = useRef(options);
  
  // Update the options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log('Attempting to connect to:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        optionsRef.current.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          setLastMessage(message);
          optionsRef.current.onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected - Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
        setIsConnected(false);
        optionsRef.current.onDisconnect?.();
        
        // Only auto-reconnect if it wasn't a clean close (code 1000) and not a manual disconnect
        if (event.code !== 1000 && wsRef.current === ws) {
          console.log('Will attempt to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (wsRef.current === ws) { // Only reconnect if this is still the current connection
              connect();
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        optionsRef.current.onError?.(error);
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    console.log('Manually disconnecting WebSocket');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (wsRef.current) {
      // Set to null first to prevent reconnection
      const ws = wsRef.current;
      wsRef.current = null;
      ws.close(1000, 'Manual disconnect');
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, []);

  useEffect(() => {
    // Prevent double connections in StrictMode
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Small delay to prevent rapid connection attempts
    const connectTimer = setTimeout(() => {
      connect();
    }, 100);
    
    return () => {
      clearTimeout(connectTimer);
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
};
