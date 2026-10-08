import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  X,
  CreditCard,
  Building,
  BrainCircuit,
  MessageSquare,
  PhoneCall,
  Check,
  Ban,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Wallet,
  Activity,
  Zap,
} from 'lucide-react';
import AuditDrawer from './AuditDrawer';

export const formatINR = (val) => {
  const num = Math.round(Number(val) || 0);
  return `₹${num.toLocaleString('en-IN')}`;
};

export const CaseTable = ({
  cases = [],
  onRetryCase,
  onApproveCase,
  onRejectCase,
  onDiagnoseCase,
  onSelectCaseForWhatsApp,
  onSelectCaseForVoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCase, setSelectedCase] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [diagnosingId, setDiagnosingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [auditLogsForDrawer, setAuditLogsForDrawer] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Track cases transitioning to RECOVERED to trigger momentary green ripple effect
  const [ripplingCaseIds, setRipplingCaseIds] = useState(new Set());
  const prevStatusMapRef = useRef({});

  useEffect(() => {
    const nextRipples = new Set(ripplingCaseIds);
    let triggerUpdate = false;

    cases.forEach((c) => {
      const id = c.caseNumber || c.caseId;
      const prevStatus = prevStatusMapRef.current[id];
      const currStatus = (c.status || '').toUpperCase();

      // Trigger ripple if moving into RECOVERED from another status
      if (prevStatus && prevStatus !== 'RECOVERED' && currStatus === 'RECOVERED') {
        nextRipples.add(id);
        triggerUpdate = true;
        setTimeout(() => {
          setRipplingCaseIds((current) => {
            const updated = new Set(current);
            updated.delete(id);
            return updated;
          });
        }, 2500);
      }
      prevStatusMapRef.current[id] = currStatus;
    });

    if (triggerUpdate) {
      setRipplingCaseIds(nextRipples);
    }
  }, [cases]);

  // Compute counts for filter tabs
  const filterCounts = React.useMemo(() => {
    const counts = {
      'All': cases.length,
      'High Risk': 0,
      'UPI Failures': 0,
      'High-Value Invoices': 0,
      'Awaiting Approval': 0,
    };

    cases.forEach((c) => {
      const amount = Number(c.transaction?.amount ?? c.amount ?? 0);
      const status = (c.status || '').toUpperCase();
      const paymentMethod = (c.transaction?.paymentMethod || 'UPI').toUpperCase();
      const errorStr = (c.transaction?.errorCode || c.failureCode || '').toLowerCase();
      const prob = Number(c.aiDiagnosis?.recoveryProbability ?? (c.riskScore ? (100 - c.riskScore) / 100 : 0.65));

      if (prob < 0.5 || status === 'FAILED' || (c.riskScore && c.riskScore >= 70)) {
        counts['High Risk']++;
      }
      if (paymentMethod === 'UPI' || errorStr.includes('upi') || errorStr.includes('npci')) {
        counts['UPI Failures']++;
      }
      if (amount >= 50000 || c.category === 'OVERDUE_INVOICE' || paymentMethod === 'INVOICE') {
        counts['High-Value Invoices']++;
      }
      if (status === 'AWAITING_HUMAN') {
        counts['Awaiting Approval']++;
      }
    });

    return counts;
  }, [cases]);

  // 1. Filter Logic matching specification:
  // "All", "High Risk", "UPI Failures", "High-Value Invoices", "Awaiting Approval"
  const filteredCases = cases.filter((c) => {
    const caseIdStr = (c.caseId || c.caseNumber || '').toLowerCase();
    const nameStr = (c.customer?.name || '').toLowerCase();
    const vpaStr = (c.customer?.vpa || '').toLowerCase();
    const errorStr = (c.transaction?.errorCode || c.failureCode || '').toLowerCase();
    const categoryStr = (c.category || '').toLowerCase();

    const matchesSearch =
      caseIdStr.includes(searchTerm.toLowerCase()) ||
      nameStr.includes(searchTerm.toLowerCase()) ||
      vpaStr.includes(searchTerm.toLowerCase()) ||
      errorStr.includes(searchTerm.toLowerCase()) ||
      categoryStr.includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const amount = Number(c.transaction?.amount ?? c.amount ?? 0);
    const status = (c.status || '').toUpperCase();
    const paymentMethod = (c.transaction?.paymentMethod || 'UPI').toUpperCase();
    const probability = Number(c.aiDiagnosis?.recoveryProbability ?? (c.riskScore ? (100 - c.riskScore) / 100 : 0.65));

    switch (activeFilter) {
      case 'High Risk':
        return probability < 0.5 || status === 'FAILED' || (c.riskScore && c.riskScore >= 70);
      case 'UPI Failures':
        return paymentMethod === 'UPI' || errorStr.includes('upi') || errorStr.includes('npci');
      case 'High-Value Invoices':
        return amount >= 50000 || c.category === 'OVERDUE_INVOICE' || paymentMethod === 'INVOICE';
      case 'Awaiting Approval':
        return status === 'AWAITING_HUMAN';
      default:
        return true;
    }
  });

  // Handle Retry Action
  const handleRetry = async (caseItem, e) => {
    if (e) e.stopPropagation();
    const id = caseItem.caseNumber || caseItem.caseId;
    setRetryingId(id);
    try {
      if (onRetryCase) {
        const res = await onRetryCase(id);
        if (res?.data?.status === 'RECOVERED' || res?.data?.status === 'recovered') {
          // Add ripple effect for this case
          setRipplingCaseIds((prev) => new Set([...prev, id]));
          confetti({
            particleCount: 75,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#06B6D4', '#F59E0B'],
          });
        }
      }
    } finally {
      setRetryingId(null);
    }
  };

  // Handle Approve Action for AWAITING_HUMAN cases
  const handleApprove = async (caseItem, e) => {
    if (e) e.stopPropagation();
    const id = caseItem.caseNumber || caseItem.caseId;
    setApprovingId(id);
    try {
      if (onApproveCase) {
        await onApproveCase(id);
        // Add momentary green ripple effect
        setRipplingCaseIds((prev) => new Set([...prev, id]));
        setTimeout(() => {
          setRipplingCaseIds((current) => {
            const updated = new Set(current);
            updated.delete(id);
            return updated;
          });
        }, 2500);

        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#F59E0B', '#34D399'],
        });
        if (selectedCase && (selectedCase.caseId === id || selectedCase.caseNumber === id)) {
          setSelectedCase((prev) => ({ ...prev, status: 'RECOVERED' }));
        }
      }
    } finally {
      setApprovingId(null);
    }
  };

  // Handle Reject Action for AWAITING_HUMAN cases
  const handleReject = async (caseItem, e) => {
    if (e) e.stopPropagation();
    const id = caseItem.caseNumber || caseItem.caseId;
    setRejectingId(id);
    try {
      if (onRejectCase) {
        await onRejectCase(id, 'Risk check rejected by human compliance officer');
        if (selectedCase && (selectedCase.caseId === id || selectedCase.caseNumber === id)) {
          setSelectedCase((prev) => ({ ...prev, status: 'FAILED' }));
        }
      }
    } finally {
      setRejectingId(null);
    }
  };

  // Handle Row Selection & Drawer Audit History Fetch
  const handleRowClick = async (caseItem) => {
    setSelectedCase(caseItem);
    const id = caseItem.caseNumber || caseItem.caseId;
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/cases/${id}/audit`);
      const data = await res.json();
      if (data.success && data.auditTrail) {
        setAuditLogsForDrawer(data.auditTrail);
      } else {
        setAuditLogsForDrawer([]);
      }
    } catch (e) {
      setAuditLogsForDrawer([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Distinct Glowing Status Badge Pills
  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'DETECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            DETECTED
          </span>
        );
      case 'DIAGNOSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Sparkles className="w-3 h-3 animate-spin text-cyan-600" />
            DIAGNOSING
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            SCHEDULED
          </span>
        );
      case 'AWAITING_HUMAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600 animate-pulse" />
            AWAITING HUMAN
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            RECOVERED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Color-Coded Recovery Probability Progress Bar:
  // >80% Green (Emerald), 50-80% Amber, <50% Red (Risk)
  const renderProbabilityBar = (probValue) => {
    const pct = Math.round((probValue <= 1 ? probValue * 100 : probValue) || 75);
    let barColor = 'bg-[#059669]';
    let textColor = 'text-[#059669]';

    if (pct < 50) {
      barColor = 'bg-[#E11D48]';
      textColor = 'text-[#E11D48]';
    } else if (pct <= 80) {
      barColor = 'bg-[#D97706]';
      textColor = 'text-[#D97706]';
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-[1px]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${barColor}`}
          />
        </div>
        <span className={`text-xs font-mono font-bold tabular-nums ${textColor}`}>{pct}%</span>
      </div>
    );
  };

  const filterTabs = ['All', 'High Risk', 'UPI Failures', 'High-Value Invoices', 'Awaiting Approval'];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
      {/* ===================================================================== */}
      {/* TOOLBAR & FILTER TABS                                                 */}
      {/* ===================================================================== */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
              <span>Real-Time Autonomous Recovery Queue</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                LIVE DISPATCH
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Filtered telemetry: {filteredCases.length} records matching policy constraints
            </p>
          </div>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search case, VPA, name, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-56 font-mono transition-colors"
            />
          </div>

          {/* Filter Chips with dynamic counts */}
          <div className="flex flex-wrap items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono">
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab;
              const count = filterCounts[tab] || 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* HIGH-DENSITY CASE TABLE WITH LAYOUTID & GREEN RIPPLE TRANSITIONS      */}
      {/* ===================================================================== */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-mono uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Case ID</th>
              <th className="py-3 px-4">Customer & VPA</th>
              <th className="py-3 px-4">Amount (INR)</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Root Cause Diagnosis</th>
              <th className="py-3 px-4">Recovery Probability</th>
              <th className="py-3 px-4">Status Badge</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            <AnimatePresence mode="popLayout">
              {filteredCases.map((c) => {
                const caseId = c.caseNumber || c.caseId;
                const amount = c.transaction?.amount ?? c.amount ?? 0;
                const prob = c.aiDiagnosis?.recoveryProbability ?? (c.riskScore ? (100 - c.riskScore) / 100 : 0.78);
                const isRecovered = (c.status || '').toUpperCase() === 'RECOVERED';
                const isAwaitingHuman = (c.status || '').toUpperCase() === 'AWAITING_HUMAN';
                const isRippling = ripplingCaseIds.has(caseId);
                const isRetrying = retryingId === caseId;
                const isApproving = approvingId === caseId;
                const isRejecting = rejectingId === caseId;

                return (
                  <motion.tr
                    layout
                    key={caseId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={
                      isRippling
                        ? {
                            opacity: 1,
                            y: 0,
                            backgroundColor: [
                              'rgba(5, 150, 105, 0.25)',
                              'rgba(5, 150, 105, 0.10)',
                              'rgba(5, 150, 105, 0.03)',
                            ],
                            transition: { duration: 2.2, ease: 'easeOut' },
                          }
                        : isRecovered
                        ? {
                            opacity: 1,
                            y: 0,
                            backgroundColor: 'rgba(5, 150, 105, 0.04)',
                          }
                        : { opacity: 1, y: 0, backgroundColor: 'rgba(255, 255, 255, 1)' }
                    }
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                    onClick={() => handleRowClick(c)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors group relative ${
                      isRippling ? 'row-recovery-ripple' : ''
                    }`}
                  >
                    {/* 1. Case ID */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                        <span>{caseId}</span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          ({c.transaction?.gateway || c.gateway || 'RAZORPAY'})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                        Rail: {c.transaction?.paymentMethod || 'UPI'}
                      </div>
                    </td>

                    {/* 2. Customer & VPA */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 font-sans">{c.customer?.name}</div>
                      <div className="text-[11px] text-cyan-800 font-mono mt-0.5 truncate max-w-[160px] font-medium">
                        {c.customer?.vpa || c.customer?.email}
                      </div>
                    </td>

                    {/* 3. Amount (INR) */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900 text-sm tabular-nums">{formatINR(amount)}</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        Att: {c.retrySchedule?.attemptCount ?? c.attempts ?? 1}/
                        {c.retrySchedule?.maxRetries ?? c.maxAttempts ?? 3}
                      </div>
                    </td>

                    {/* 4. Category */}
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                        {c.category || 'FAILED_PAYMENT'}
                      </span>
                    </td>

                    {/* 5. Root Cause Diagnosis */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-700 truncate text-[11px] font-sans" title={c.aiDiagnosis?.rootCause}>
                        {c.aiDiagnosis?.rootCause || c.transaction?.errorDescription || c.failureReason || 'Analyzing root cause...'}
                      </div>
                      <div className="text-[10px] text-cyan-800 font-mono mt-0.5 flex items-center gap-1 font-semibold">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
                        <span>Action: {c.aiDiagnosis?.recommendedAction || 'SMART_RETRY'}</span>
                      </div>
                    </td>

                    {/* 6. Recovery Probability Meter (>80% Green, 50-80% Amber, <50% Red) */}
                    <td className="py-3.5 px-4">{renderProbabilityBar(prob)}</td>

                    {/* 7. Status Badge */}
                    <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>

                    {/* 8. Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Human Review Actions: [ Approve / Reject ] */}
                        {isAwaitingHuman ? (
                          <>
                            {onApproveCase && (
                              <button
                                onClick={(e) => handleApprove(c, e)}
                                disabled={isApproving || isRejecting}
                                title="Human Review: Approve Wire Clearance"
                                className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check className={`w-3 h-3 ${isApproving ? 'animate-spin' : ''}`} />
                                Approve
                              </button>
                            )}
                            {onRejectCase && (
                              <button
                                onClick={(e) => handleReject(c, e)}
                                disabled={isApproving || isRejecting}
                                title="Human Review: Reject Settlement Request"
                                className="px-2 py-1 rounded-md text-xs font-mono font-semibold bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
                              >
                                <Ban className={`w-3 h-3 ${isRejecting ? 'animate-spin' : ''}`} />
                                Reject
                              </button>
                            )}
                          </>
                        ) : (
                          /* [ Retry Now ] Button for active/failed cases */
                          !isRecovered && (
                            <button
                              onClick={(e) => handleRetry(c, e)}
                              disabled={isRetrying}
                              title="Execute Gateway Smart Retry"
                              className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                              Retry Now
                            </button>
                          )
                        )}

                        {/* [ Send WhatsApp ] Button */}
                        <button
                          onClick={() => {
                            if (onSelectCaseForWhatsApp) onSelectCaseForWhatsApp(c);
                          }}
                          title="Send WhatsApp 1-Click Interactive Recovery"
                          className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-xs font-mono flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden xl:inline">WhatsApp</span>
                        </button>

                        {/* [ Call Customer ] Button */}
                        <button
                          onClick={() => {
                            if (onSelectCaseForVoice) onSelectCaseForVoice(c);
                          }}
                          title="Call Customer via AI Voice Concierge Agent"
                          className="px-2 py-1 rounded-md bg-white hover:bg-cyan-50 text-cyan-800 border border-slate-200 text-xs font-mono flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-cyan-600" />
                          <span className="hidden xl:inline">Call</span>
                        </button>

                        {/* [ Cryptographic Audit Ledger ] Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(c);
                          }}
                          title="Open Cryptographic Audit Explorer & Verification Drawer"
                          className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-mono flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden xl:inline">Audit</span>
                        </button>

                        {/* Drawer Detail Chevron */}
                        <button
                          onClick={() => handleRowClick(c)}
                          title="Open AI Explainability & Audit Drawer"
                          className="p-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors shadow-xs"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* AI EXPLAINABILITY & CRYPTOGRAPHIC AUDIT DRAWER                        */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {selectedCase && (
          <AuditDrawer
            isOpen={!!selectedCase}
            caseItem={selectedCase}
            onClose={() => setSelectedCase(null)}
            onDiagnoseCase={onDiagnoseCase}
            onApproveCase={onApproveCase}
            onRejectCase={onRejectCase}
            onSelectCaseForWhatsApp={onSelectCaseForWhatsApp}
            onSelectCaseForVoice={onSelectCaseForVoice}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaseTable;
