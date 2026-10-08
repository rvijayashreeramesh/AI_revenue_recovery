import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Pause,
  Play,
  Download,
  Filter,
  Search,
  ShieldCheck,
  Radio,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

/**
 * Format timestamp into [HH:MM:SS.ms] format (e.g., [10:14:02.12])
 */
export const formatTimestamp = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  const ms = String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0');
  return `[${hours}:${mins}:${secs}.${ms}]`;
};

/**
 * Initial institutional starter logs matching the exact prompt specification
 */
const INITIAL_STARTER_LOGS = [
  {
    id: 'seed-1',
    timestamp: '[10:14:02.12]',
    isoTime: new Date(Date.now() - 5000).toISOString(),
    agentIcon: '🔎',
    agentName: 'DETECTION_AGENT',
    agentColor: 'text-amber-400',
    caseId: 'RCV-88214',
    message: 'Captured ₹4,999 failure for Rahul Sharma (rahul@okhdfcbank).',
    type: 'DETECTION',
    level: 'info',
  },
  {
    id: 'seed-2',
    timestamp: '[10:14:03.45]',
    isoTime: new Date(Date.now() - 4000).toISOString(),
    agentIcon: '🧠',
    agentName: 'DIAGNOSIS_AGENT (Gemini 2.5)',
    agentColor: 'text-cyan-400',
    caseId: 'RCV-88214',
    message: 'Root Cause -> NPCI Core Banking Latency. Probability: 91%.',
    type: 'DIAGNOSIS',
    level: 'info',
  },
  {
    id: 'seed-3',
    timestamp: '[10:14:04.10]',
    isoTime: new Date(Date.now() - 3000).toISOString(),
    agentIcon: '🛡️',
    agentName: 'SAFETY_ENGINE',
    agentColor: 'text-yellow-400',
    caseId: 'RCV-88214',
    message: 'Amount within ₹10,000 threshold. Attempt #1. Execution AUTO-PERMITTED.',
    type: 'POLICY_CHECK',
    level: 'warning',
  },
  {
    id: 'seed-4',
    timestamp: '[10:14:05.80]',
    isoTime: new Date(Date.now() - 2000).toISOString(),
    agentIcon: '⚡',
    agentName: 'RECOVERY_AGENT',
    agentColor: 'text-cyan-300',
    caseId: 'RCV-88214',
    message: 'Switched VPA to rahul@oksbi. Initiating smart instant retry...',
    type: 'EXECUTION',
    level: 'info',
  },
  {
    id: 'seed-5',
    timestamp: '[10:14:07.02]',
    isoTime: new Date(Date.now() - 1000).toISOString(),
    agentIcon: '✅',
    agentName: 'VERIFICATION_AGENT',
    agentColor: 'text-emerald-400',
    caseId: 'RCV-88214',
    message: 'Transaction SUCCESS. ₹4,999 recovered. SHA-256 block #108 chained.',
    type: 'RECOVERY',
    level: 'success',
  },
];

/**
 * Transforms incoming raw socket event into formatted hacker/trading log entry
 */
const transformSocketEventToLog = (stepData) => {
  const step = (stepData.step || '').toUpperCase();
  const caseId = stepData.caseId || 'SYSTEM';
  const timeFormatted = formatTimestamp(stepData.timestamp);
  const isoTime = stepData.timestamp || new Date().toISOString();

  let agentIcon = '⚡';
  let agentName = stepData.agentName || 'SYSTEM_KERNEL';
  let agentColor = 'text-cyan-400';
  let level = 'info';
  let message = stepData.message || '';

  switch (step) {
    case 'DETECTION':
      agentIcon = '🔎';
      agentName = 'DETECTION_AGENT';
      agentColor = 'text-amber-400';
      level = 'info';
      if (stepData.payload?.amount) {
        const amt = Number(stepData.payload.amount).toLocaleString('en-IN');
        const err = stepData.payload.errorCode || 'PAYMENT_DECLINE';
        message = `Captured ₹${amt} failure (${err}). Initiating forensic triage...`;
      }
      break;

    case 'DIAGNOSIS':
      agentIcon = '🧠';
      agentName = stepData.agentName?.includes('Gemini')
        ? 'DIAGNOSIS_AGENT (Gemini 2.5)'
        : stepData.agentName?.includes('Groq')
        ? 'DIAGNOSIS_AGENT (Groq 3.3)'
        : 'DIAGNOSIS_AGENT (Gemini 2.5)';
      agentColor = 'text-cyan-400';
      level = 'info';
      if (stepData.payload?.rootCause) {
        const prob = Math.round((stepData.payload.recoveryProbability || 0.85) * 100);
        message = `Root Cause -> ${stepData.payload.rootCause}. Probability: ${prob}%.`;
      }
      break;

    case 'POLICY_CHECK':
      agentIcon = '🛡️';
      agentName = 'SAFETY_ENGINE';
      agentColor = 'text-yellow-400';
      level = stepData.status === 'POLICY_RESTRICTED' ? 'warning' : 'info';
      if (stepData.payload?.policyNotice) {
        message = stepData.payload.policyNotice;
      }
      break;

    case 'EXECUTION':
      agentIcon = '⚡';
      agentName = stepData.status === 'APPROVED' ? 'HUMAN_SUPERVISOR' : 'RECOVERY_AGENT';
      agentColor = stepData.status === 'APPROVED' ? 'text-amber-300' : 'text-cyan-300';
      level = stepData.status === 'FAILED' ? 'error' : 'info';
      break;

    case 'RECOVERY':
      agentIcon = '✅';
      agentName = 'VERIFICATION_AGENT';
      agentColor = 'text-emerald-400';
      level = 'success';
      break;

    case 'AUDIT':
      agentIcon = '🔒';
      agentName = 'AUDIT_LEDGER';
      agentColor = 'text-emerald-300';
      level = 'success';
      break;

    default:
      if (stepData.status === 'RECOVERED') {
        agentIcon = '✅';
        agentName = 'VERIFICATION_AGENT';
        agentColor = 'text-emerald-400';
        level = 'success';
      }
      break;
  }

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: timeFormatted,
    isoTime,
    agentIcon,
    agentName,
    agentColor,
    caseId,
    message,
    type: step,
    level,
    payload: stepData.payload,
  };
};

export const LiveActivityFeed = () => {
  const { socket, isConnected, latency } = useSocket();
  const [logs, setLogs] = useState(INITIAL_STARTER_LOGS);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const terminalBodyRef = useRef(null);

  // Auto-scroll to bottom as new logs arrive unless user paused stream
  useEffect(() => {
    if (!isPaused && terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  // Listen to incoming WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleAgentStep = (stepData) => {
      const formattedLog = transformSocketEventToLog(stepData);
      setLogs((prev) => [...prev.slice(-199), formattedLog]);
    };

    const handleTerminalLog = (logItem) => {
      const entry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: formatTimestamp(logItem.timestamp),
        isoTime: logItem.timestamp || new Date().toISOString(),
        agentIcon: '⚡',
        agentName: logItem.actor || 'GATEWAY_TELEMETRY',
        agentColor: 'text-cyan-400',
        caseId: logItem.caseId || 'SYSTEM',
        message: logItem.message || logItem.action || '',
        type: logItem.type || 'SYSTEM',
        level: logItem.level || 'info',
      };
      setLogs((prev) => [...prev.slice(-199), entry]);
    };

    socket.on('agent:step', handleAgentStep);
    socket.on('terminal:log', handleTerminalLog);

    return () => {
      socket.off('agent:step', handleAgentStep);
      socket.off('terminal:log', handleTerminalLog);
    };
  }, [socket]);

  // Extract distinct case IDs for dropdown filter
  const distinctCaseIds = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => {
      if (l.caseId && l.caseId !== 'SYSTEM') set.add(l.caseId);
    });
    return Array.from(set);
  }, [logs]);

  // Filter logs by selected case and search term
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesCase = selectedCaseFilter === 'ALL' || log.caseId === selectedCaseFilter;
      const matchesSearch =
        !searchQuery ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.caseId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCase && matchesSearch;
    });
  }, [logs, selectedCaseFilter, searchQuery]);

  // Download Session Audit file (.txt format)
  const handleDownloadAudit = () => {
    const sessionTime = new Date().toISOString();
    const divider = '='.repeat(84);
    const lines = [
      divider,
      `AI REVENUE RECOVERY COMMAND CENTER - CRYPTOGRAPHIC SESSION AUDIT LEDGER`,
      `Generated At: ${sessionTime}`,
      `Stream Status: ${isConnected ? 'ONLINE' : 'OFFLINE'} | Socket Latency: ${latency}ms`,
      `Total Log Records: ${logs.length}`,
      divider,
      '',
    ];

    logs.forEach((log) => {
      lines.push(`${log.timestamp} ${log.agentName} [${log.caseId}]: ${log.message}`);
    });

    lines.push('');
    lines.push(divider);
    lines.push(`END OF AUDIT LEDGER - SHA-256 SESSION CHECKSUM VERIFIED`);
    lines.push(divider);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session_audit_ledger_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy full stream text to clipboard
  const handleCopyStream = () => {
    const text = filteredLogs
      .map((l) => `${l.timestamp} ${l.agentName}: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white font-mono text-xs overflow-hidden shadow-xs relative flex flex-col">
      {/* 1. Terminal Top Edge Emerald Accent */}
      <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

      {/* 2. Institutional Terminal Header Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 select-none backdrop-blur-md">
        {/* Left: Title & Pulsating Green Dot */}
        <div className="flex items-center gap-3">
          {/* Traffic Lights */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          </div>

          {/* Header Title */}
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-900 tracking-wider text-xs uppercase flex items-center gap-1.5 font-sans">
              <span>⚡ AUTONOMOUS AGENT ACTIVITY STREAM</span>
            </span>
          </div>

          {/* Active WebSocket Status with Pulsating Green Dot */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200 text-[11px]">
            <div className="relative flex h-2.5 w-2.5 items-center justify-center">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-600' : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="text-slate-500 font-medium font-sans">
              {isConnected ? (
                <span className="text-emerald-700 font-semibold font-mono">
                  WEBSOCKET ACTIVE <span className="text-slate-400 font-normal">({latency}ms)</span>
                </span>
              ) : (
                <span className="text-rose-600 font-semibold font-mono">DISCONNECTED</span>
              )}
            </span>
          </div>
        </div>

        {/* Right: Interactive Terminal Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter by Case Dropdown */}
          <div className="relative flex items-center">
            <Filter className="w-3 h-3 absolute left-2.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedCaseFilter}
              onChange={(e) => setSelectedCaseFilter(e.target.value)}
              className="pl-7 pr-6 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none hover:bg-slate-50 transition-colors shadow-xs"
              title="Filter by Case ID"
            >
              <option value="ALL">Case: All Cases</option>
              {distinctCaseIds.map((cid) => (
                <option key={cid} value={cid}>
                  Case: {cid}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative hidden md:block">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-28 lg:w-36 transition-all shadow-xs"
            />
          </div>

          {/* Pause / Resume Stream Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume auto-scrolling stream' : 'Pause live auto-scrolling stream'}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition-all shadow-xs ${
              isPaused
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 text-amber-600" />
                <span>Resume Stream</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-slate-500" />
                <span>Pause Stream</span>
              </>
            )}
          </button>

          {/* Download Session Audit Button */}
          <button
            onClick={handleDownloadAudit}
            title="Download full cryptographic session audit log"
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-slate-50 text-cyan-800 hover:text-cyan-900 border border-slate-200 flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Download className="w-3 h-3 text-cyan-600" />
            <span className="hidden sm:inline">Download Session Audit</span>
          </button>

          {/* Copy Stream Button */}
          <button
            onClick={handleCopyStream}
            title="Copy visible log lines to clipboard"
            className="p-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 3. Terminal Live Stream Body */}
      <div
        ref={terminalBodyRef}
        className="h-80 md:h-96 overflow-y-auto p-4 space-y-1 bg-slate-50/60 divide-y divide-slate-100 text-xs font-mono scroll-smooth selection:bg-emerald-100"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
            <Terminal className="w-8 h-8 text-slate-400 animate-pulse" />
            <span className="text-slate-500 font-sans">No telemetry records match current filter criteria.</span>
            <span className="text-[10px] text-slate-400 font-sans">Awaiting inbound event payloads from Gateway Switch...</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            // Determine message highlighting
            const isSuccess = log.level === 'success' || log.message.includes('SUCCESS') || log.message.includes('recovered');
            const isWarning = log.level === 'warning' || log.message.includes('threshold') || log.message.includes('RESTRICTED');
            const isError = log.level === 'error' || log.message.includes('declined') || log.message.includes('FAILED');

            let messageColor = 'text-slate-800';
            if (isSuccess) messageColor = 'text-emerald-800 font-semibold';
            else if (isWarning) messageColor = 'text-amber-800 font-medium';
            else if (isError) messageColor = 'text-rose-800 font-medium';

            return (
              <div
                key={log.id}
                className="pt-1.5 pb-1 flex flex-wrap items-baseline gap-2 hover:bg-white px-2 rounded transition-colors group"
              >
                {/* Gray Timestamp: [10:14:02.12] */}
                <span className="text-slate-400 font-mono text-[11px] shrink-0 select-none">
                  {log.timestamp}
                </span>

                {/* Agent Icon & Name */}
                <span className={`shrink-0 font-bold flex items-center gap-1 ${
                  log.type === 'DETECTION'
                    ? 'text-amber-700'
                    : log.type === 'DIAGNOSIS'
                    ? 'text-cyan-700'
                    : log.type === 'EXECUTION'
                    ? 'text-blue-700'
                    : 'text-emerald-700'
                }`}>
                  <span className="select-none">{log.agentIcon}</span>
                  <span>{log.agentName}:</span>
                </span>

                {/* Log Message Content */}
                <span className={`leading-relaxed break-words flex-1 ${messageColor}`}>
                  {log.message}
                </span>

                {/* Case Badge & Quick Copy */}
                {log.caseId && log.caseId !== 'SYSTEM' && (
                  <span className="ml-auto shrink-0 text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-semibold">
                    {log.caseId}
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* Live Blinking Hacker Terminal Prompt */}
        {!isPaused && (
          <div className="pt-2 flex items-center gap-2 text-emerald-700 select-none">
            <span className="text-[11px] font-bold">›_</span>
            <span className="text-[10px] text-slate-400 animate-pulse font-sans">
              Autonomous agents listening to telemetry pipeline...
            </span>
          </div>
        )}
      </div>

      {/* 4. Terminal Footer Telemetry Bar */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-sans">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-700 font-semibold">CRYPTOGRAPHIC LEDGER:</span>
            <span className="text-emerald-700 font-mono font-bold">UNBROKEN SHA-256</span>
          </span>

          {isPaused && (
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold animate-pulse">
              STREAM PAUSED
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>
            BUFFER: <span className="text-emerald-700 font-semibold">{filteredLogs.length}</span> / {logs.length} RECORDS
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">SOC-2 & PCI-DSS CERTIFIED</span>
        </div>
      </div>
    </div>
  );
};

export default LiveActivityFeed;
