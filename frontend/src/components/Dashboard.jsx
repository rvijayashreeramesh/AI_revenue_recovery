import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Layers,
  Terminal,
  MessageSquare,
  PhoneCall,
  Bot,
  Zap,
  Shield,
  RefreshCw,
  Radio,
  Sliders,
  ExternalLink,
  PlusCircle,
  Sparkles,
  Command,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  X,
  Volume2,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import Header from './Header';
import MetricsGrid from './MetricsGrid';
import CaseTable from './CaseTable';
import LiveTerminal from './LiveTerminal';
import LiveActivityFeed from './LiveActivityFeed';
import RiskHeatmap from './RiskHeatmap';
import WhatsAppGatewayConsole from './WhatsAppGatewayConsole';
import VoiceAgent from './VoiceAgent';
import Copilot from './Copilot';
import CopilotDrawer from './CopilotDrawer';
import AuditDrawer from './AuditDrawer';
import { useSocket } from '../hooks/useSocket';

export const Dashboard = () => {
  const { lastEvent, isConnected, latency } = useSocket();
  const [activeTab, setActiveTab] = useState('overview');
  const [cases, setCases] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [injecting, setInjecting] = useState(false);
  const [selectedCaseForChannel, setSelectedCaseForChannel] = useState(null);
  const [dockedWhatsAppCase, setDockedWhatsAppCase] = useState(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedCaseForAudit, setSelectedCaseForAudit] = useState(null);
  const [demoStatus, setDemoStatus] = useState(null);
  const [humanApprovalData, setHumanApprovalData] = useState(null);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K to toggle AI Recovery Copilot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCopilotOpen(false);
        setSelectedCaseForAudit(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectCaseFromCopilot = (caseId) => {
    const found = cases.find(
      (c) => c.caseId === caseId || c.caseNumber === caseId
    ) || {
      caseId,
      caseNumber: caseId,
      customer: { name: 'Identified Enterprise Client', company: 'Corporate' },
      status: 'AWAITING_HUMAN',
      amount: 4999,
      failureReason: 'Gateway processing hold',
    };
    setSelectedCaseForAudit(found);
  };

  // Fetch initial cases and metrics
  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesRes, metricsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/cases/metrics/overview'),
      ]);

      const casesData = await casesRes.json();
      const metricsData = await metricsRes.json();

      if (casesData.success && casesData.data) {
        setCases(casesData.data);
      }
      if (metricsData.success && metricsData.data) {
        setMetrics(metricsData.data);
      }
    } catch (err) {
      console.error('Failed to load initial fintech dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll Pitch Demo status if running
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/demo/status');
        const json = await res.json();
        if (json.success && json.status) {
          setDemoStatus(json.status);
        }
      } catch (err) {
        // demo runner inactive
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to WebSocket events for real-time Pitch Demo & Live Case updates
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'demo:step') {
      const { stepId, caseItem } = lastEvent.data || {};
      fetchData();

      if (stepId === 'STEP_2_WHATSAPP_LINK') {
        const target = caseItem || {
          caseId: 'RCV-40192',
          caseNumber: 'RCV-40192',
          customer: { name: 'Priya Patel', email: 'priya.patel@horizon.co', phone: '+91 80159 92021' },
          amount: 14500,
          currency: 'INR',
          status: 'WHATSAPP_SENT',
          failureReason: 'INSUFFICIENT_FUNDS',
        };
        setSelectedCaseForChannel(target);
        setActiveTab('whatsapp');
      } else if (stepId === 'STEP_3_HIGH_VALUE_HOLD') {
        setHumanApprovalData(lastEvent.data);
      } else if (stepId === 'STEP_4_COMPLETED') {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.4 },
          colors: ['#059669', '#10B981', '#06B6D4'],
        });
      }
    } else if (lastEvent.type === 'case:updated') {
      setCases((prev) =>
        prev.map((c) => (c.caseId === lastEvent.data.caseId ? lastEvent.data : c))
      );
      fetch('/api/cases/metrics/overview')
        .then((r) => r.json())
        .then((d) => d.success && setMetrics(d.data));
    } else if (lastEvent.type === 'case:new') {
      setCases((prev) => [lastEvent.data, ...prev]);
      fetch('/api/cases/metrics/overview')
        .then((r) => r.json())
        .then((d) => d.success && setMetrics(d.data));
    }
  }, [lastEvent]);

  // Demo Pitch Handlers
  const handleStartPitchDemo = async () => {
    try {
      const res = await fetch('/api/demo/start', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.status) {
        setDemoStatus(json.status);
      }
    } catch (err) {
      console.error('Failed to start demo:', err);
    }
  };

  const handleStopPitchDemo = async () => {
    try {
      const res = await fetch('/api/demo/stop', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.status) {
        setDemoStatus(json.status);
      }
    } catch (err) {
      console.error('Failed to stop demo:', err);
    }
  };

  const handleResetBaseline = async () => {
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to reset baseline:', err);
    }
  };

  const handleApproveVoiceCallDemo = async () => {
    try {
      const res = await fetch('/api/demo/approve-voice', { method: 'POST' });
      const json = await res.json();
      const targetCase = json.case || humanApprovalData?.caseItem || {
        caseId: 'RCV-30442',
        caseNumber: 'RCV-30442',
        customer: { name: 'Vikramaditya Singhania', company: 'TechCorp India', phone: '+91 99887 76655' },
        amount: 180000,
        status: 'RECOVERED',
      };

      setHumanApprovalData(null);
      setSelectedCaseForChannel(targetCase);
      setActiveTab('voice');

      // Trigger Confetti
      confetti({
        particleCount: 120,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#059669', '#10B981', '#06B6D4'],
      });

      // Trigger Speech Synthesis
      const speechGreeting =
        'Hello Vikramaditya, this is the Priority Settlement Concierge for TechCorp India. We noticed your quarterly invoice of ₹1,80,000 was temporarily held. I can immediately execute a real-time corporate wire release or re-route through your backup corporate account. Would you like me to authorize this now?';

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechGreeting);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }

      fetchData();
    } catch (err) {
      console.error('Failed to approve voice call:', err);
    }
  };

  const handleApproveCase = async (caseId) => {
    const res = await fetch(`/api/cases/${caseId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorName: 'Principal Architect', notes: 'Approved for settlement' }),
    });
    const data = await res.json();
    if (data.success && data.data) {
      setCases((prev) => prev.map((c) => (c.caseId === caseId ? data.data : c)));
      fetch('/api/cases/metrics/overview')
        .then((r) => r.json())
        .then((d) => d.success && setMetrics(d.data));
    }
    return data;
  };

  const handleRejectCase = async (caseId, reason) => {
    const res = await fetch(`/api/cases/${caseId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorName: 'Principal Finance Architect',
        reason: reason || 'Manual risk check rejected by operator',
      }),
    });
    const data = await res.json();
    if (data.success && data.data) {
      setCases((prev) => prev.map((c) => (c.caseId === caseId ? data.data : c)));
      fetch('/api/cases/metrics/overview')
        .then((r) => r.json())
        .then((d) => d.success && setMetrics(d.data));
    }
    return data;
  };

  const handleRetryCase = async (caseId) => {
    const res = await fetch(`/api/cases/${caseId}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator: 'Fintech Command Lead' }),
    });
    const data = await res.json();
    if (data.success && data.data) {
      setCases((prev) => prev.map((c) => (c.caseId === caseId ? data.data : c)));
      fetch('/api/cases/metrics/overview')
        .then((r) => r.json())
        .then((d) => d.success && setMetrics(d.data));
    }
    return data;
  };

  const handleDiagnoseCase = async (caseId) => {
    const res = await fetch(`/api/cases/${caseId}/diagnose`, { method: 'POST' });
    const data = await res.json();
    if (data.success && data.data) {
      setCases((prev) => prev.map((c) => (c.caseId === caseId ? data.data : c)));
    }
    return data;
  };

  const handleInjectFailure = async (scenario = 'NPCI_DOWNTIME') => {
    try {
      setInjecting(true);
      const res = await fetch('/api/simulation/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCases((prev) => [
          data.data,
          ...prev.filter((c) => (c.caseId || c.caseNumber) !== (data.data.caseId || data.data.caseNumber)),
        ]);
        fetch('/api/cases/metrics/overview')
          .then((r) => r.json())
          .then((d) => d.success && setMetrics(d.data));
      }
      return data;
    } catch (err) {
      console.error('Failed to inject scenario:', err);
    } finally {
      setInjecting(false);
    }
  };

  const handleSelectCaseForWhatsApp = (caseItem) => {
    setSelectedCaseForChannel(caseItem);
    setActiveTab('whatsapp');
  };

  const handleSelectCaseForVoice = (caseItem) => {
    setSelectedCaseForChannel(caseItem);
    setActiveTab('voice');
  };

  const tabs = [
    { id: 'overview', label: 'Command Overview', icon: Layers },
    { id: 'heatmaps', label: 'Risk Heatmaps & Rails', icon: Activity },
    { id: 'terminal', label: 'Telemetry Stream', icon: Terminal },
    { id: 'whatsapp', label: 'Live WhatsApp Gateway', icon: MessageSquare },
    { id: 'voice', label: 'AI Voice Concierge', icon: PhoneCall },
    { id: 'copilot', label: 'Recovery Copilot', icon: Bot },
  ];

  return (
    <div className="min-h-screen w-full w-screen overflow-x-hidden bg-[#F8FAFC] text-slate-900 font-sans flex flex-col relative selection:bg-emerald-100 selection:text-emerald-900">
      {/* Institutional Sticky Header with Live Status Pill & Quick Simulation Actions */}
      <Header
        metrics={metrics}
        activeCasesCount={cases.filter((c) => c.status !== 'RECOVERED' && c.status !== 'recovered').length}
        onInjectScenario={handleInjectFailure}
        injecting={injecting}
        isConnected={isConnected}
        latency={latency}
        demoStatus={demoStatus}
        onStartDemo={handleStartPitchDemo}
        onStopDemo={handleStopPitchDemo}
        onResetDemo={handleResetBaseline}
      />

      {/* Modern Stripe / Linear Navigation Tabs Sub-header */}
      <div className="bg-white/90 border-b border-slate-200/80 backdrop-blur-md sticky top-[61px] z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex space-x-1 pt-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-sans font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 text-slate-900 bg-slate-50 font-bold shadow-xs'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Full-Width Command Center Body */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* 5-Column Metrics Grid */}
              <MetricsGrid metrics={metrics} isNewFailureInjected={injecting} />

              {/* Indian Banking & Payment Rail Health Matrix & Telemetry */}
              <RiskHeatmap cases={cases} />

              {/* High-Density Case Queue Table */}
              <CaseTable
                cases={cases}
                onRetryCase={handleRetryCase}
                onApproveCase={handleApproveCase}
                onRejectCase={handleRejectCase}
                onDiagnoseCase={handleDiagnoseCase}
                onSelectCaseForWhatsApp={handleSelectCaseForWhatsApp}
                onSelectCaseForVoice={handleSelectCaseForVoice}
              />

              {/* Streaming Live Terminal / Activity Feed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-bold uppercase text-slate-500 tracking-wider">
                    Institutional Audit & Real-time Event Ledger
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Zero-latency WebSocket Link
                  </span>
                </div>
                <LiveActivityFeed />
              </div>
            </motion.div>
          )}

          {activeTab === 'heatmaps' && (
            <motion.div
              key="heatmaps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <RiskHeatmap cases={cases} />
            </motion.div>
          )}

          {activeTab === 'terminal' && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LiveActivityFeed />
            </motion.div>
          )}

          {activeTab === 'whatsapp' && (
            <motion.div
              key="whatsapp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <WhatsAppGatewayConsole
                activeCase={selectedCaseForChannel || cases[0]}
                cases={cases}
                onCaseRecovered={(recoveredCase) => {
                  fetchData();
                }}
              />
            </motion.div>
          )}

          {activeTab === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <VoiceAgent
                activeCase={selectedCaseForChannel || cases[0]}
                onCallEnded={(c) => {
                  fetchData();
                }}
              />
            </motion.div>
          )}

          {activeTab === 'copilot' && (
            <motion.div
              key="copilot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Copilot cases={cases} onSelectCase={handleSelectCaseFromCopilot} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Copilot Drawer Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCopilotOpen(true)}
          className="px-4 py-2.5 rounded-full bg-slate-900 text-white shadow-lg border border-slate-700 flex items-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <Bot className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-sans font-bold">Ask AI Copilot</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
            ⌘K
          </kbd>
        </motion.button>
      </div>

      {/* Natural Language AI Copilot Drawer */}
      <CopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        cases={cases}
        onSelectCase={handleSelectCaseFromCopilot}
      />

      {/* Cryptographic Audit Drawer for Individual Case */}
      {selectedCaseForAudit && (
        <AuditDrawer
          isOpen={!!selectedCaseForAudit}
          caseItem={selectedCaseForAudit}
          onClose={() => setSelectedCaseForAudit(null)}
          onSelectCaseForWhatsApp={(c) => {
            setSelectedCaseForAudit(null);
            handleSelectCaseForWhatsApp(c);
          }}
          onSelectCaseForVoice={(c) => {
            setSelectedCaseForAudit(null);
            handleSelectCaseForVoice(c);
          }}
        />
      )}

      {/* Human Approval Required Modal */}
      <AnimatePresence>
        {humanApprovalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="w-full max-w-2xl bg-white border border-amber-300 rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Modal Alert Header */}
              <div className="p-5 border-b border-amber-200 bg-amber-50 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 mt-0.5">
                    <AlertTriangle className="w-6 h-6 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                        BOUNDED SAFETY RULE #1 ENFORCED
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">T+50s QUARANTINE</span>
                    </div>
                    <h3 className="text-base font-sans font-bold text-slate-900 mt-1">
                      Human Approval Required • Autonomous Retries Halted
                    </h3>
                    <p className="text-xs text-amber-900 font-sans mt-0.5 font-medium">
                      Transaction amount ₹1,80,000 exceeds ₹50,000 automated execution limit.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setHumanApprovalData(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Case Intel & Forensics Body */}
              <div className="p-6 space-y-4 bg-white font-sans text-xs">
                {/* Entity & Amount Pill Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-sans uppercase">Case ID</div>
                    <div className="font-bold text-slate-900 mt-0.5">
                      {humanApprovalData?.caseId || 'RCV-30442'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[10px] text-amber-700 font-sans uppercase font-bold">Overdue Invoice</div>
                    <div className="font-bold text-amber-900 text-sm mt-0.5 tabular-nums">
                      ₹{(humanApprovalData?.amount || 180000).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                    <div className="text-[10px] text-slate-400 font-sans uppercase">Enterprise Client</div>
                    <div className="font-bold text-slate-900 truncate mt-0.5 font-sans">
                      {humanApprovalData?.customerName || humanApprovalData?.company || 'TechCorp India'}
                    </div>
                  </div>
                </div>

                {/* Forensics / Safety Diagnosis */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-cyan-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Gemini 2.5 Flash & Groq Dual-LLM Forensic Analysis:</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Corporate card fraud prevention block. Foreign IP mismatch detected during payroll run.
                    Safety policy prohibited automated retries on ₹1,80,000 exposure to prevent issuing acquirer penalties.
                  </p>
                </div>

                {/* Recommended Resolution */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                    <span>AI Recommended Action: VIP AI Voice Concierge</span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    Direct verbal escalation to Vikramaditya Singhania (Finance Director) to verify identity
                    and re-route charge to primary corporate wire with zero friction.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => setHumanApprovalData(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-sans font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                >
                  Hold in Quarantine
                </button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApproveVoiceCallDemo}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center justify-center gap-2 border border-emerald-700"
                >
                  <PhoneCall className="w-4 h-4 text-white" />
                  <span>Approve Voice Call</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-sans font-semibold">
                    Launch Concierge
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Status Bar */}
      <footer className="border-t border-slate-200/80 bg-white py-3.5 text-xs font-mono text-slate-500">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">●</span>
            <span className="font-semibold text-slate-700">AI REVENUE RECOVERY ENGINE v1.0.0</span>
            <span>•</span>
            <span>SOC2 TYPE II VERIFIED</span>
          </div>
          <div>
            <span>AUTONOMOUS SCHEDULER: </span>
            <span className="text-slate-800 font-bold">ACTIVE (HEARTBEAT 15s)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
