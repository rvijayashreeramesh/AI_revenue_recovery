import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

export const useWhatsAppSocket = () => {
  const { socket } = useSocket();
  const [gatewayStatus, setGatewayStatus] = useState({
    isConnected: false,
    isReady: false,
    readyTimestamp: null,
    qrCodeData: null,
    clientInfo: null,
    error: null,
  });
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  const [lastInboundMessage, setLastInboundMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch initial connection status and active logs
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setGatewayStatus({
          isConnected: !!(data.isConnected || data.isReady),
          isReady: !!(data.isReady || data.isConnected),
          readyTimestamp: data.readyTimestamp || null,
          qrCodeData: data.qrCodeData || null,
          clientInfo: data.clientInfo || null,
          error: data.error || null,
          activeNumbers: json.demoNumbers || data.activeNumbers || null,
          allowedNumbers: data.allowedNumbers || null,
        });

        if (data.qrCodeData) {
          setQrDataUrl(data.qrCodeData);
        } else if (data.isConnected || data.isReady) {
          setQrDataUrl(null);
        }
      }
    } catch (err) {
      console.warn('[useWhatsAppSocket] Status fetch error:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/logs');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.logs)) {
          setTelemetryLogs(json.logs);
        }
      }
    } catch (err) {
      console.warn('[useWhatsAppSocket] Logs fetch error:', err.message);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    fetchStatus();
    fetchLogs();

    if (!socket) return;

    const handleQr = (data) => {
      console.log('[useWhatsAppSocket] Received QR event');
      const url = data.qrDataUrl || data.qr;
      setQrDataUrl(url);
      setGatewayStatus((prev) => ({
        ...prev,
        isConnected: false,
        isReady: false,
        qrCodeData: url,
      }));
    };

    const handleReady = (data) => {
      console.log('[useWhatsAppSocket] Gateway ONLINE ready event', data);
      setQrDataUrl(null);
      setGatewayStatus((prev) => ({
        ...prev,
        isConnected: true,
        isReady: true,
        readyTimestamp: data.timestamp || new Date(),
        clientInfo: data.clientInfo || prev.clientInfo,
        qrCodeData: null,
      }));
    };

    const handleDisconnected = (data) => {
      console.log('[useWhatsAppSocket] Gateway Disconnected event', data);
      setGatewayStatus((prev) => ({
        ...prev,
        isConnected: false,
        isReady: false,
      }));
    };

    const handleStatus = (data) => {
      if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      if (data.connected !== undefined || data.isConnected !== undefined) {
        const connected = !!(data.connected || data.isConnected);
        setGatewayStatus((prev) => ({
          ...prev,
          isConnected: connected,
          isReady: connected,
          clientInfo: data.clientInfo || prev.clientInfo,
        }));
        if (connected) setQrDataUrl(null);
      }
    };

    const handleTelemetry = (logItem) => {
      setTelemetryLogs((prev) => [logItem, ...prev.slice(0, 199)]);
    };

    const handleMessageReceived = (msgData) => {
      setLastInboundMessage(msgData);
      setTelemetryLogs((prev) => [
        {
          id: `TEL-IN-${Date.now()}`,
          timestamp: new Date(),
          direction: 'INBOUND',
          phone: msgData.phone,
          caseId: msgData.caseId,
          payload: msgData.text,
          intent: msgData.recovered ? 'RECOVERY_CONFIRMED' : 'REPLY_RECEIVED',
          status: 'RECEIVED',
        },
        ...prev.slice(0, 199),
      ]);
    };

    socket.on('whatsapp:qr', handleQr);
    socket.on('whatsapp:ready', handleReady);
    socket.on('whatsapp:disconnected', handleDisconnected);
    socket.on('whatsapp:status', handleStatus);
    socket.on('whatsapp:telemetry', handleTelemetry);
    socket.on('whatsapp:message_received', handleMessageReceived);

    return () => {
      socket.off('whatsapp:qr', handleQr);
      socket.off('whatsapp:ready', handleReady);
      socket.off('whatsapp:disconnected', handleDisconnected);
      socket.off('whatsapp:status', handleStatus);
      socket.off('whatsapp:telemetry', handleTelemetry);
      socket.off('whatsapp:message_received', handleMessageReceived);
    };
  }, [socket, fetchStatus, fetchLogs]);

  // Operator Actions
  const reconnectSession = async () => {
    setIsResetting(true);
    setActionMessage('Purging session tokens and restarting Chromium instance...');
    try {
      const res = await fetch('/api/whatsapp/reconnect', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setActionMessage('Session reset. Awaiting new QR pairing scan...');
        setTimeout(() => {
          fetchStatus();
          setIsResetting(false);
          setActionMessage(null);
        }, 3000);
      }
    } catch (err) {
      setActionMessage(`Error resetting session: ${err.message}`);
      setIsResetting(false);
    }
  };

  const sendRecoveryAlert = async ({ phone, customerName, amount, failureReason, caseId }) => {
    try {
      const res = await fetch('/api/whatsapp/send-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, customerName, amount, failureReason, caseId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLogs();
      }
      return data;
    } catch (err) {
      console.error('[sendRecoveryAlert] Error:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    gatewayStatus,
    qrDataUrl,
    telemetryLogs,
    lastInboundMessage,
    isLoading,
    isResetting,
    actionMessage,
    reconnectSession,
    sendRecoveryAlert,
    refreshStatus: fetchStatus,
    refreshLogs: fetchLogs,
  };
};

export default useWhatsAppSocket;
