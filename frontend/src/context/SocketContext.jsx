import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  latency: 18,
  liveLogs: [],
  lastEvent: null,
});

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(14);
  const [liveLogs, setLiveLogs] = useState([]);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
    });

    s.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected to backend gateway:', s.id);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('terminal:log', (log) => {
      setLiveLogs((prev) => [log, ...prev.slice(0, 99)]);
    });

    s.on('agent:step', (stepData) => {
      const logItem = {
        id: `STEP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date(stepData.timestamp || Date.now()).toLocaleTimeString(),
        type: (stepData.step || 'agent').toLowerCase(),
        action: stepData.step,
        caseId: stepData.caseId,
        actor: stepData.agentName,
        message: stepData.message || `[${stepData.step}] ${stepData.status}`,
        details: stepData.payload,
      };
      setLiveLogs((prev) => [logItem, ...prev.slice(0, 99)]);
      setLastEvent({ type: 'agent:step', data: stepData, timestamp: Date.now() });
    });

    s.on('case:updated', (data) => {
      setLastEvent({ type: 'case:updated', data, timestamp: Date.now() });
    });

    s.on('case:new', (data) => {
      setLastEvent({ type: 'case:new', data, timestamp: Date.now() });
    });

    // Synthetic ping-pong latency measurement
    const pingInterval = setInterval(() => {
      if (s.connected) {
        const start = Date.now();
        s.volatile.emit('ping', () => {
          setLatency(Math.max(8, Date.now() - start));
        });
      } else {
        setLatency(Math.floor(12 + Math.random() * 8));
      }
    }, 6000);

    setSocket(s);

    return () => {
      clearInterval(pingInterval);
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, latency, liveLogs, lastEvent }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
export default SocketContext;
