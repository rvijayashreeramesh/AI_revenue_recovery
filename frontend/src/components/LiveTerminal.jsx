import React, { useState, useRef, useEffect } from 'react';
import { Terminal, ShieldCheck, Pause, Play, Trash2, Copy, Check, Radio } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

export const LiveTerminal = () => {
  const { liveLogs, isConnected, latency } = useSocket();
  const [isPaused, setIsPaused] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const scrollRef = useRef(null);

  // Auto scroll unless user paused
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [liveLogs, isPaused]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = liveLogs.filter((log) => {
    if (categoryFilter === 'ALL') return true;
    return (log.type || '').toUpperCase() === categoryFilter;
  });

  const getLogTypeBadge = (type) => {
    const t = (type || 'system').toLowerCase();
    if (t.includes('ai') || t.includes('inference')) {
      return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30';
    }
    if (t.includes('gateway')) {
      return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
    }
    if (t.includes('omnichannel')) {
      return 'text-amber-400 bg-amber-950/60 border-amber-500/30';
    }
    if (t.includes('critical') || t.includes('risk')) {
      return 'text-rose-400 bg-rose-950/60 border-rose-500/30';
    }
    return 'text-slate-400 bg-carbon-900 border-white/10';
  };

  return (
    <div className="rounded-xl border border-translucent bg-carbon-950 font-mono text-xs overflow-hidden shadow-2xl relative">
      {/* Scanline animated line */}
      <div className="terminal-scanline" />

      {/* Terminal Header Bar */}
      <div className="p-3 bg-carbon-900 border-b border-translucent flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-200 tracking-wide text-[11px] uppercase">
              Financial Telemetry Stream
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Radio
              className={`w-3 h-3 ${isConnected ? 'text-recovered animate-pulse' : 'text-slate-500'}`}
            />
            <span>{isConnected ? `Online (${latency}ms)` : 'Connecting...'}</span>
          </div>
        </div>

        {/* Category Filter Chips & Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-carbon-950 border border-white/10 rounded-md text-[10px]">
            {['ALL', 'GATEWAY', 'AI_INFERENCE', 'OMNICHANNEL'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  categoryFilter === cat
                    ? 'bg-carbon-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'AI_INFERENCE' ? 'AI' : cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume live feed' : 'Pause live feed'}
            className={`p-1.5 rounded bg-carbon-850 hover:bg-carbon-800 border border-white/10 text-slate-300 transition-colors ${
              isPaused ? 'text-amber-400 border-amber-500/30' : ''
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Terminal Stream Console */}
      <div
        ref={scrollRef}
        className="h-80 overflow-y-auto p-4 space-y-2.5 bg-carbon-950/95 divide-y divide-white/[0.02]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 text-center py-12 flex flex-col items-center justify-center gap-2">
            <Terminal className="w-6 h-6 text-slate-600 animate-pulse" />
            <span>Awaiting cryptographic event payloads from Gateway Switch...</span>
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={log.id || idx}
              className="pt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-2 hover:bg-carbon-900/40 p-1.5 rounded transition-colors group"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-slate-500 text-[10px] whitespace-nowrap pt-0.5">
                  [{log.timestamp || new Date().toLocaleTimeString()}]
                </span>

                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase border ${getLogTypeBadge(
                    log.type
                  )}`}
                >
                  {log.action || log.type}
                </span>

                <div className="text-slate-300 text-[11px] leading-relaxed">
                  <span className="text-cyan-400 font-semibold">{log.caseId ? `${log.caseId}: ` : ''}</span>
                  {log.message}

                  {log.actor && (
                    <span className="text-slate-500 text-[10px] ml-2 font-mono">by {log.actor}</span>
                  )}
                </div>
              </div>

              {/* Cryptographic SHA-256 seal & Copy */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-start opacity-70 group-hover:opacity-100 transition-opacity">
                {log.checksum && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-carbon-900 px-1.5 py-0.5 rounded border border-white/5"
                    title={`SHA-256 Seal: ${log.checksum}`}
                  >
                    <ShieldCheck className="w-2.5 h-2.5 text-recovered" />
                    {log.checksum.slice(0, 8)}
                  </span>
                )}

                <button
                  onClick={() => copyToClipboard(JSON.stringify(log, null, 2), log.id)}
                  className="p-1 rounded hover:bg-carbon-800 text-slate-500 hover:text-slate-200 transition-colors"
                  title="Copy JSON Payload"
                >
                  {copiedId === log.id ? (
                    <Check className="w-3 h-3 text-recovered" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer Telemetry */}
      <div className="p-2.5 bg-carbon-900/90 border-t border-translucent flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <div>
          <span>SECURITY SEAL: </span>
          <span className="text-recovered">SOC2 / PCI-DSS COMPLIANT AUDIT TRAIL</span>
        </div>
        <div>
          <span>RECORDS BUFFER: </span>
          <span className="text-cyan-400">{liveLogs.length} LOGS IN MEMORY</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminal;
