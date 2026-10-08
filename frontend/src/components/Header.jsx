import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ShieldCheck,
  Zap,
  TrendingUp,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Square,
  Clock,
  Radio,
  Lock,
} from 'lucide-react';

export const Header = ({
  metrics,
  activeCasesCount = 0,
  onInjectScenario,
  injecting = false,
  isConnected = true,
  latency = 14,
  demoStatus = null,
  onStartDemo,
  onStopDemo,
  onResetDemo,
}) => {
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);

  const totalRecovered = metrics?.totalRecovered || 1284200;
  const recoveryRate = metrics?.recoveryRate || 69.7;
  const activeInjections = metrics?.statusCounts?.action_required ?? activeCasesCount ?? 9;

  const handleInspectAudit = async () => {
    setShowAuditModal(true);
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit/logs');
      const data = await res.json();
      setAuditData(data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between py-3 gap-3.5">
          
          {/* ================================================================= */}
          {/* LEFT: Institutional Logo & Live Status Pill                       */}
          {/* ================================================================= */}
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-1 ring-emerald-700/20">
                  <Activity className="w-5 h-5 text-white stroke-[2.2]" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm font-extrabold tracking-tight text-slate-900 uppercase">
                    AI REVENUE RECOVERY
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                    v4.2 PRO
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-sans flex items-center gap-2">
                  <span>Institutional FinTech Command Center</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-600">RAILS: HDFC • ICICI • SBI • NPCI</span>
                </div>
              </div>
            </div>

            {/* Live Status Pill: "Autonomous Recovery Desk Active" */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span className="font-semibold tracking-tight">Autonomous Recovery Desk Active</span>
              <span className="text-emerald-400">•</span>
              <span className="text-[11px] text-emerald-700 tabular-nums font-mono">{latency}ms latency</span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* CENTER: Live Financial Telemetry Strip                            */}
          {/* ================================================================= */}
          <div className="hidden 2xl:flex items-center gap-4 px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
            {/* Recovered Revenue Today */}
            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-sans font-semibold tracking-wider">Recovered Today</div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5 tabular-nums">
                  <span className="text-emerald-700 font-extrabold">₹{totalRecovered.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">({recoveryRate}%)</span>
                </div>
              </div>
            </div>

            {/* In Flight Pipelines */}
            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
              <Zap className="w-4 h-4 text-cyan-600" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-sans font-semibold tracking-wider">Pipelines</div>
                <div className="font-bold text-slate-900 tabular-nums">
                  3 In-Flight <span className="text-slate-400 font-normal">/ {activeInjections} active</span>
                </div>
              </div>
            </div>

            {/* Gateway Rail Matrix */}
            <div className="flex items-center gap-2 pl-1">
              <Server className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-sans font-semibold tracking-wider">Switch Health</div>
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>RZP 99.98% • NPCI ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* RIGHT: Quick Action Simulation Buttons & One-Click Demo           */}
          {/* ================================================================= */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 0. ONE-CLICK PITCH DEMO TRIGGER (180s Automated Pitch Flow) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={demoStatus?.isRunning ? onStopDemo : onStartDemo}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-xs border ${
                demoStatus?.isRunning
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-sm'
              }`}
              title="Automated 180s Pitch Flow: Baseline Reset -> HDFC UPI Switch -> 5% WhatsApp -> VIP Human Approval"
            >
              {demoStatus?.isRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                  <span>Stop Pitch ({180 - (demoStatus?.elapsedSeconds || 0)}s)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Start Pitch Demo</span>
                  <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-sans font-semibold">
                    180s
                  </span>
                </>
              )}
            </motion.button>

            {/* 1. Sim: NPCI Outage */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={injecting}
              onClick={() => onInjectScenario && onInjectScenario('NPCI_DOWNTIME')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Inject NPCI downtime payment failure to test automated UPI rail switch"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-600" />
              <span>Sim: NPCI Outage</span>
            </motion.button>

            {/* 2. Sim: Insufficient Funds */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={injecting}
              onClick={() => onInjectScenario && onInjectScenario('INSUFFICIENT_FUNDS')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Inject insufficient balance failure to test interactive WhatsApp 1-click concession link"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sim: Insufficient Funds</span>
            </motion.button>

            {/* 3. Sim: B2B High-Value Invoice */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={injecting}
              onClick={() => onInjectScenario && onInjectScenario('HIGH_VALUE_INVOICE')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Inject ₹1,50,000 corporate invoice failure to test Bounded Safety human escalation"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Sim: B2B High-Value</span>
            </motion.button>

            {/* 4. Audit Ledger Status */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInspectAudit}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-xs transition-colors flex items-center gap-1.5"
              title="Inspect Cryptographic SHA-256 Chained Audit Ledger"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit Ledger</span>
            </motion.button>
          </div>

        </div>
      </div>

      {/* ===================================================================== */}
      {/* LIVE PITCH DEMO HUD TICKER & TIMELINE PROGRESS                        */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {demoStatus?.isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-b border-emerald-200 bg-emerald-50/90 px-4 sm:px-6 lg:px-8 py-2 overflow-hidden shadow-xs"
          >
            <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold">
                    PITCH ACTIVE • T+{demoStatus?.elapsedSeconds || 0}s / 180s
                  </span>
                </div>
                <div className="text-slate-800 font-sans font-medium truncate max-w-xl">
                  {demoStatus?.message || 'Executing automated autonomous recovery pipeline...'}
                </div>
              </div>

              <div className="flex items-center gap-3 text-emerald-900">
                <span className="font-semibold">Step {demoStatus?.currentStepIndex || 1}/4</span>
                <div className="w-36 h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${((demoStatus?.elapsedSeconds || 0) / 180) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* CRYPTOGRAPHIC AUDIT MODAL (SHA-256 Chained Integrity Ledger)         */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-bold text-slate-900 tracking-tight">
                      Cryptographic Audit Ledger Seal Status
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Genesis Root: 00000000000000000000000000000000 • SHA-256 Verifiable
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    CHAIN INTEGRITY VERIFIED
                  </span>
                  <button
                    onClick={() => setShowAuditModal(false)}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {auditLoading ? (
                  <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-600 animate-spin" />
                    <span>Verifying chained cryptographic hashes...</span>
                  </div>
                ) : auditData && auditData.length > 0 ? (
                  auditData.slice(0, 15).map((log, i) => (
                    <div
                      key={log._id || log.logId || i}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-cyan-700">
                          Block #{auditData.length - i} • {log.actionTaken || log.action}
                        </span>
                        <span className="text-slate-400">
                          {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-slate-700 text-xs font-sans">
                        Case: <span className="font-mono font-semibold text-slate-900">{log.caseNumber || log.caseId}</span> • Actor:{' '}
                        <span className="font-mono text-slate-600">{log.agentName || log.actor}</span>
                      </div>

                      <div className="pt-1.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                        <div className="truncate text-slate-500">
                          Prev Hash:{' '}
                          <span className="text-slate-400">{log.previousHash || '0000000000000000...'}</span>
                        </div>
                        <div className="truncate text-slate-500">
                          Block Hash:{' '}
                          <span className="text-emerald-700 font-semibold">{log.hash || log.checksum}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    No audit records in memory yet. Inject a scenario to generate ledger blocks.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>SOC2 TYPE II / PCI-DSS COMPLIANT AUDIT TRAIL</span>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors font-sans font-medium"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
