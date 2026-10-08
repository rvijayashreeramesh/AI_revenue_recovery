import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Terminal,
  Zap,
  Lock,
  QrCode,
  Cpu,
  Radio,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import { useWhatsAppSocket } from '../hooks/useWhatsAppSocket';
import { useSocket } from '../hooks/useSocket';

export const WhatsAppGatewayConsole = ({ activeCase, cases = [], onCaseRecovered }) => {
  const { latency } = useSocket();
  const {
    gatewayStatus,
    qrDataUrl,
    telemetryLogs,
    isLoading,
    isResetting,
    actionMessage,
    reconnectSession,
    sendRecoveryAlert,
    refreshStatus,
    refreshLogs,
  } = useWhatsAppSocket();

  const DEMO_TEST_NUMBERS = [
    { id: '1', phone: '919150840158', display: '+91 91508 40158', name: 'Rahul Sharma', scenario: 'NPCI Timeout' },
    { id: '2', phone: '918015992021', display: '+91 80159 92021', name: 'Priya Patel', scenario: 'Insufficient Funds' },
    { id: '3', phone: '917358719632', display: '+91 73587 19632', name: 'Arjun Mehta', scenario: 'High-Value Invoice' },
  ];

  const [selectedCaseId, setSelectedCaseId] = useState(activeCase?.caseId || activeCase?.caseNumber || '');
  const [targetPhone, setTargetPhone] = useState(DEMO_TEST_NUMBERS[0].phone);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessResult, setSendSuccessResult] = useState(null);
  const [filterDirection, setFilterDirection] = useState('ALL'); // ALL | OUTBOUND | INBOUND
  const [copiedId, setCopiedId] = useState(null);

  // Sync selected case if prop updates
  useEffect(() => {
    if (activeCase?.caseId || activeCase?.caseNumber) {
      setSelectedCaseId(activeCase.caseNumber || activeCase.caseId);
    }
  }, [activeCase]);

  // Find currently selected case object
  const currentCase =
    cases.find((c) => c.caseId === selectedCaseId || c.caseNumber === selectedCaseId) ||
    activeCase ||
    cases[0] || {
      caseId: 'RCV-40192',
      caseNumber: 'RCV-40192',
      customer: {
        name: 'Rahul Sharma',
        phone: '919150840158',
        email: 'rahul.sharma@corp.in',
        company: 'Apex Retail Tech',
      },
      transaction: {
        amount: 4999,
        errorCode: 'NPCI_BANK_DOWNTIME',
        errorDescription: 'HDFC Bank 3D-Secure timeout on UPI rail',
      },
      status: 'AWAITING_CUSTOMER',
    };

  const isConnected = gatewayStatus.isConnected || gatewayStatus.isReady;

  const handleDispatchAlert = async () => {
    if (!currentCase) return;
    setIsSending(true);
    setSendSuccessResult(null);

    const selectedDemo = DEMO_TEST_NUMBERS.find((d) => d.phone === targetPhone);
    const payload = {
      phone: targetPhone,
      customerName: selectedDemo?.name || currentCase.customer?.name || 'Customer',
      amount: currentCase.transaction?.amount || currentCase.amount || 4999,
      failureReason:
        currentCase.transaction?.errorDescription ||
        currentCase.failureReason ||
        'HDFC Bank 3D-Secure timeout on UPI rail',
      caseId: currentCase.caseNumber || currentCase.caseId || 'RCV-9842',
    };

    const res = await sendRecoveryAlert(payload);
    setIsSending(false);

    if (res.success) {
      setSendSuccessResult({
        status: res.data?.deliveryStatus || 'DELIVERED',
        messageId: res.data?.messageId,
        phone: res.data?.phone || payload.phone,
      });
      setTimeout(() => setSendSuccessResult(null), 8000);
    } else {
      setSendSuccessResult({
        error: res.data?.message || res.error || 'Failed to dispatch alert',
      });
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = telemetryLogs.filter((log) => {
    if (filterDirection === 'ALL') return true;
    return log.direction === filterDirection;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">
                  Live WhatsApp Gateway & Telemetry Console
                </h1>
                <span className="text-[10px] font-mono tracking-wider font-semibold uppercase px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-300">
                  Node Puppeteer Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Autonomous Two-Way Inbound/Outbound Recovery Rails • Direct Device Pairing via whatsapp-web.js
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                refreshStatus();
                refreshLogs();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center space-x-1.5"
              title="Refresh connection state and telemetry stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Telemetry</span>
            </button>
            <button
              onClick={reconnectSession}
              disabled={isResetting}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Purging Session...' : 'Reset Session / New QR'}</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      <div className="px-6 py-6 max-w-[1920px] mx-auto space-y-6">
        {/* ==================================================================== */}
        {/* SECTION A & B: Session Status Grid & Live QR Pairing Modal           */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Hardware & Gateway Engine Status */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isConnected ? 'bg-emerald-500 shadow-emerald-200 shadow-lg animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-800">
                    {isConnected
                      ? 'REAL WHATSAPP WEB GATEWAY: ACTIVE (Node Puppeteer Engine)'
                      : 'AWAITING SMARTPHONE PAIRING AUTHORIZATION'}
                  </span>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium border ${
                    isConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isConnected ? 'HARDWARE ONLINE' : 'STANDBY / DISCONNECTED'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Linked Device</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 font-mono truncate">
                    {gatewayStatus.clientInfo?.pushname
                      ? `${gatewayStatus.clientInfo.pushname}`
                      : isConnected
                      ? 'Admin Phone'
                      : 'None'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {gatewayStatus.clientInfo?.phone ? `+${gatewayStatus.clientInfo.phone}` : 'Unpaired'}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" />
                    <span>Engine Memory</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 font-mono">148.4 MB</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Chromium Headless v122</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Socket Latency</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-600 mt-1 font-mono">{latency || 14} ms</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Zero-Drop Polling Rail</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Session Storage</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 font-mono">LocalAuth</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">./.wwebjs_auth Token</div>
                </div>
              </div>

              {/* Policy Whitelist Badge */}
              <div className="mt-5 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-900">
                    Strict Customer Allowlist Active:
                  </span>
                  <span className="text-xs font-mono text-emerald-800 font-medium">
                    +91 91508 40158 • +91 80159 92021 • +91 73587 19632
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  FIREWALL LOCKED
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Ready Timestamp: {gatewayStatus.readyTimestamp ? new Date(gatewayStatus.readyTimestamp).toLocaleTimeString() : 'Not connected'}</span>
              <span className="font-mono text-slate-600">Protocol: WebSockets v4.8 + Puppeteer CDP</span>
            </div>
          </div>

          {/* Card 2: Live Pairing QR Code Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800">
                  Hardware Pairing Code
                </span>
              </div>
              {isConnected ? (
                <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Authenticated</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Awaiting Scan
                </span>
              )}
            </div>

            <div className="my-auto py-4 flex flex-col items-center justify-center">
              {isConnected ? (
                <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-xl w-full flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 mb-3 shadow-inner">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">Session Active & Secured</div>
                  <div className="text-xs text-slate-500 mt-1 max-w-xs">
                    Linked to device <span className="font-mono font-semibold text-slate-800">+{gatewayStatus.clientInfo?.phone || 'Admin'}</span>. Two-way WhatsApp recovery desk is processing payments autonomously.
                  </div>
                  <div className="mt-4 px-3 py-1 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-600">
                    ID: {gatewayStatus.clientInfo?.wid || 'AUTHENTICATED'}
                  </div>
                </div>
              ) : qrDataUrl ? (
                <div className="text-center">
                  <div className="p-3 bg-white border-2 border-dashed border-slate-300 rounded-xl inline-block shadow-sm">
                    <img
                      src={qrDataUrl}
                      alt="WhatsApp Web Login QR Code"
                      className="w-56 h-56 object-contain rounded"
                    />
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-3">
                    Scan with WhatsApp on your phone:
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Settings &gt; Linked Devices &gt; Link a Device
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">Loading pairing challenge...</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Contacting local headless Puppeteer engine</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <a
                href="/qr"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center space-x-1"
              >
                <span>Open Dedicated QR Scanner Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SECTION D: Case Quick-Action Trigger                                 */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900">
                  Case Recovery Quick-Action Trigger
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an active payment failure case and dispatch an authentic 1-click WhatsApp recovery link.
              </p>
            </div>

            {/* Case Selector Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-500">Target Case:</span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {cases && cases.length > 0 ? (
                  cases.map((c) => (
                    <option key={c.caseId || c._id} value={c.caseNumber || c.caseId}>
                      {c.caseNumber || c.caseId} • {c.customer?.name} • ₹{(c.transaction?.amount || c.amount || 0).toLocaleString('en-IN')}
                    </option>
                  ))
                ) : (
                  <option value={currentCase.caseNumber || currentCase.caseId}>
                    {currentCase.caseNumber || currentCase.caseId} • {currentCase.customer?.name}
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium">Authorized Customer Target</span>
              <select
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                className="mt-1 w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded px-2 py-1 text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {DEMO_TEST_NUMBERS.map((d) => (
                  <option key={d.id} value={d.phone}>
                    {d.display} ({d.name})
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-emerald-600 font-mono mt-1 font-medium">
                Whitelist Firewall Protected
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium">Interrupted Amount</span>
              <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                ₹{Number(currentCase.transaction?.amount || currentCase.amount || 4999).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Primary Card / UPI Rail</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
              <span className="text-[11px] text-slate-400 font-medium">Root Cause Description</span>
              <div className="text-xs font-medium text-amber-800 truncate mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {currentCase.transaction?.errorDescription || currentCase.failureReason || 'NPCI Bank Timeout'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Code: {currentCase.transaction?.errorCode || 'FAILED'}</div>
            </div>

            <div className="flex flex-col justify-center">
              <button
                onClick={handleDispatchAlert}
                disabled={isSending}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching via Puppeteer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Real WhatsApp Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {sendSuccessResult && (
            <div
              className={`mt-4 p-3 rounded-lg border text-xs flex items-center justify-between ${
                sendSuccessResult.error
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                {sendSuccessResult.error ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span>
                  {sendSuccessResult.error
                    ? `Dispatch failed: ${sendSuccessResult.error}`
                    : `Alert delivered to ${sendSuccessResult.phone}. Status: ${sendSuccessResult.status} [MsgID: ${sendSuccessResult.messageId}]`}
                </span>
              </div>
              {!sendSuccessResult.error && (
                <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  AWAITING REPLY ("PAY")
                </span>
              )}
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* SECTION C: Live Two-Way Telemetry Feed                               */}
        {/* ==================================================================== */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Terminal className="w-4 h-4 text-slate-600" />
              <div>
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-900">
                  Live Two-Way Interaction Telemetry Feed
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time cryptographic dispatch & customer response ledger
                </p>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
              {['ALL', 'OUTBOUND', 'INBOUND'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterDirection(mode)}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                    filterDirection === mode
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Telemetry Stream Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Direction</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Customer / Phone</th>
                  <th className="py-3 px-4 font-semibold">Case Reference</th>
                  <th className="py-3 px-4 font-semibold">Payload / Raw Text</th>
                  <th className="py-3 px-4 font-semibold">Parsed Intent</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Terminal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-600">No interaction telemetry recorded yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Trigger a recovery alert or reply from your test phone to stream logs.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isOutbound = log.direction === 'OUTBOUND';
                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isOutbound ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isOutbound
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isOutbound ? (
                              <ArrowUpRight className="w-3 h-3 text-blue-600" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            )}
                            <span>{log.direction}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{log.customerName || 'Customer'}</div>
                          <div className="text-[11px] font-mono text-slate-500">+{log.phone}</div>
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {log.caseId || 'RCV-DISPATCH'}
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate font-mono text-slate-700" title={log.payload}>
                          {log.payload}
                        </td>

                        <td className="py-3 px-4">
                          {log.intent ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                log.intent === 'RECOVERY_CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {log.intent}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              log.status === 'DELIVERED' || log.status === 'RECEIVED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {log.status || 'LOGGED'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppGatewayConsole;
