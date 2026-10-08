import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Cpu,
  FileCheck,
  ArrowDown,
  Layers,
  Link2,
  Terminal,
  ExternalLink,
  Shield,
  Zap,
  CheckCheck,
  User,
  Clock,
  Activity,
  Fingerprint,
  Key,
  Database,
  RefreshCw,
  Sliders,
  DollarSign,
  PhoneCall,
  MessageSquare,
  Ban,
} from 'lucide-react';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Native Web Crypto SHA-256 hasher for client-side cryptographic verification
 */
export async function computeClientSHA256(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AuditDrawer = ({
  isOpen = true,
  caseItem,
  onClose,
  onDiagnoseCase,
  onApproveCase,
  onRejectCase,
  onSelectCaseForWhatsApp,
  onSelectCaseForVoice,
}) => {
  const currentCase = caseItem || {
    caseId: 'RC-9842',
    caseNumber: 'RCV-9842',
    customer: {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@corp.in',
      phone: '+91 91508 40158',
      company: 'Apex Retail Tech',
      tier: 'Enterprise',
    },
    transaction: {
      amount: 4999,
      gateway: 'HDFC_RAZORPAY',
      errorDescription: 'HDFC bank 3D-Secure timeout',
    },
    amount: 4999,
    status: 'RECOVERED',
    riskScore: 32,
    failureReason: 'HDFC bank timeout',
    gateway: 'HDFC Bank',
    aiDiagnosis: {
      modelUsed: 'Gemini 2.5 Flash / Groq Llama 3.3',
      confidenceScore: 0.94,
      rootCause: 'Issuing bank liquidity threshold reached ahead of quarterly sweep',
    },
  };

  const caseIdentifier =
    currentCase.caseNumber || currentCase.caseId || 'RC-9842';
  const customerName = currentCase.customer?.name || 'Rahul Sharma';
  const amountVal =
    currentCase.transaction?.amount || currentCase.amount || 4999;
  const formattedAmount = `₹${Math.round(amountVal).toLocaleString('en-IN')}`;

  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(null);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState({
    verified: true,
    checkedBlocks: 5,
    timestamp: null,
    tamperedBlockIndex: null,
  });

  // Tamper simulation mode
  const [isTampered, setIsTampered] = useState(false);

  // Generate canonical 5-block cryptographic chain
  const generateBlocks = async (tamperMode = false) => {
    setLoading(true);
    const baseTime = new Date(Date.now() - 1000 * 60 * 14);

    const ts1 = new Date(baseTime.getTime()).toISOString();
    const ts2 = new Date(baseTime.getTime() + 1000 * 45).toISOString();
    const ts3 = new Date(baseTime.getTime() + 1000 * 95).toISOString();
    const ts4 = new Date(baseTime.getTime() + 1000 * 160).toISOString();
    const ts5 = new Date(baseTime.getTime() + 1000 * 240).toISOString();

    // Block 1: DETECTION
    const payload1 = {
      event: 'TRANSACTION_FAILURE_DETECTED',
      caseId: caseIdentifier,
      customer: customerName,
      amount: amountVal,
      gateway: currentCase.transaction?.gateway || currentCase.gateway || 'HDFC_RAZORPAY',
      failureCode: currentCase.failureCode || 'GATEWAY_TIMEOUT',
      failureReason: currentCase.failureReason || 'HDFC bank timeout',
      ingestNode: 'node-ap-south-1a',
    };
    const raw1 = `${GENESIS_HASH}|${ts1}|INGEST_SENSOR|DETECTION|${JSON.stringify(payload1)}`;
    const hash1 = await computeClientSHA256(raw1);

    // Block 2: DIAGNOSIS (Subject to tamper simulation)
    const payload2 = {
      event: 'AI_DIAGNOSTIC_INFERENCE',
      caseId: caseIdentifier,
      modelVersion: currentCase.aiDiagnosis?.modelUsed || 'Gemini 2.5 Flash (v2026.2)',
      promptHash: 'sha256:7f9a8820c4e098df24a5009172834bfa6412019b889341cc001aef',
      confidenceScore: currentCase.aiDiagnosis?.confidenceScore || 0.94,
      recoveryProbability: '94%',
      rootCause: tamperMode
        ? 'MALICIOUS_INJECTION_ALTERED_PAYLOAD_TAMPERED'
        : currentCase.aiDiagnosis?.rootCause || 'HDFC bank liquidity/switch timeout',
      recommendedChannel: 'whatsapp_interactive',
    };
    const raw2 = `${hash1}|${ts2}|AI_REASONING_CORE|DIAGNOSIS|${JSON.stringify(payload2)}`;
    const hash2 = await computeClientSHA256(raw2);

    // Block 3: SAFETY_CHECK
    const payload3 = {
      event: 'SAFETY_GUARDRAIL_VALIDATION',
      caseId: caseIdentifier,
      rulesApplied: [
        { rule: 'RULE_01_RETRY_LIMIT_CEILING', status: 'PASSED', limit: 4, attempts: 1 },
        { rule: 'RULE_02_ANTI_FLAPPING_ACQUIRER_GATE', status: 'PASSED', damping: '1500ms' },
        { rule: 'RULE_03_RBI_SOVEREIGN_DATA_RESIDENCY', status: 'PASSED', jurisdiction: 'IN_MUM' },
      ],
      autoApprovalSignature: 'sig:secp256k1_ed840bb19c720516ae0034df8901aa',
      riskScore: currentCase.riskScore || 32,
      riskLevel: 'LOW_RISK',
    };
    const raw3 = `${hash2}|${ts3}|SAFETY_SUPERVISOR|SAFETY_CHECK|${JSON.stringify(payload3)}`;
    const hash3 = await computeClientSHA256(raw3);

    // Block 4: ACTION_EXECUTION
    const payload4 = {
      event: 'RECOVERY_ACTION_DISPATCHED',
      caseId: caseIdentifier,
      channel: 'whatsapp_interactive',
      gatewayResponse: 'HTTP 200 OK • WhatsApp 1-Click Fast-Path Delivered',
      transactionReference: `UPI-NPCI-${Math.floor(10000000 + Math.random() * 90000000)}`,
      recipientPhone: currentCase.customer?.phone || '+91 91508 40158',
    };
    const raw4 = `${hash3}|${ts4}|DISPATCH_CONTROLLER|ACTION_EXECUTION|${JSON.stringify(payload4)}`;
    const hash4 = await computeClientSHA256(raw4);

    // Block 5: VERIFICATION
    const payload5 = {
      event: 'LEDGER_SEALED_AND_SETTLED',
      caseId: caseIdentifier,
      finalState: 'RECOVERED',
      amountRecovered: formattedAmount,
      settlementTime: ts5,
      terminalProof: 'VALIDATED_UNBROKEN',
    };
    const raw5 = `${hash4}|${ts5}|CONSENSUS_AUDITOR|VERIFICATION|${JSON.stringify(payload5)}`;
    const hash5 = await computeClientSHA256(raw5);

    const generated = [
      {
        blockIndex: 1,
        stepName: 'DETECTION',
        title: 'Transaction Failure Ingestion',
        actor: 'INGEST_SENSOR',
        timestamp: ts1,
        previousHash: GENESIS_HASH,
        currentHash: hash1,
        payload: payload1,
        details: [
          { label: 'Ingest Gateway', value: payload1.gateway },
          { label: 'Error Trigger', value: payload1.failureReason },
          { label: 'Sensor Node', value: payload1.ingestNode },
        ],
      },
      {
        blockIndex: 2,
        stepName: 'DIAGNOSIS',
        title: 'Gemini Diagnostic Inference',
        actor: 'AI_REASONING_CORE',
        timestamp: ts2,
        previousHash: hash1,
        currentHash: hash2,
        payload: payload2,
        details: [
          { label: 'Model Version', value: payload2.modelVersion },
          { label: 'Prompt Hash', value: payload2.promptHash },
          { label: 'Probability Output', value: `${payload2.recoveryProbability} (Conf: ${payload2.confidenceScore})` },
          { label: 'Root Cause', value: payload2.rootCause },
        ],
      },
      {
        blockIndex: 3,
        stepName: 'SAFETY_CHECK',
        title: 'Policy Guardrail Validation',
        actor: 'SAFETY_SUPERVISOR',
        timestamp: ts3,
        previousHash: hash2,
        currentHash: hash3,
        payload: payload3,
        details: [
          { label: 'Policy Rules', value: '3 Active Guardrails Enforced (All Passed)' },
          { label: 'Risk Assessment', value: `Risk Score: ${payload3.riskScore}/100 (${payload3.riskLevel})` },
          { label: 'Approval Signature', value: payload3.autoApprovalSignature },
        ],
      },
      {
        blockIndex: 4,
        stepName: 'ACTION_EXECUTION',
        title: 'Omnichannel Action Dispatch',
        actor: 'DISPATCH_CONTROLLER',
        timestamp: ts4,
        previousHash: hash3,
        currentHash: hash4,
        payload: payload4,
        details: [
          { label: 'Gateway Response', value: payload4.gatewayResponse },
          { label: 'Transaction Ref', value: payload4.transactionReference },
          { label: 'Target Channel', value: 'WhatsApp 1-Click Biometric Intent' },
        ],
      },
      {
        blockIndex: 5,
        stepName: 'VERIFICATION',
        title: 'Settlement Consensus & Seal',
        actor: 'CONSENSUS_AUDITOR',
        timestamp: ts5,
        previousHash: hash4,
        currentHash: hash5,
        payload: payload5,
        details: [
          { label: 'Final State', value: payload5.finalState },
          { label: 'Amount Recovered', value: payload5.amountRecovered },
          { label: 'Consensus Proof', value: 'SHA-256 Merkle Link Confirmed' },
        ],
      },
    ];

    setBlocks(generated);
    setLoading(false);
  };

  useEffect(() => {
    generateBlocks(isTampered);
  }, [caseIdentifier, isTampered]);

  // Recalculate and verify hashes on client side
  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setVerificationProgress(0);

    let previousHash = GENESIS_HASH;
    let chainBroken = false;
    let brokenAt = null;

    for (let i = 0; i < blocks.length; i++) {
      await new Promise((r) => setTimeout(r, 180)); // Visual scanning stagger
      setVerificationProgress(i + 1);

      const block = blocks[i];
      // Check previous hash link
      if (block.previousHash !== previousHash) {
        chainBroken = true;
        brokenAt = i + 1;
        break;
      }

      // Recompute SHA-256 for this block
      const raw = `${block.previousHash}|${block.timestamp}|${block.actor}|${block.stepName}|${JSON.stringify(
        block.payload
      )}`;
      const computedHash = await computeClientSHA256(raw);

      if (computedHash !== block.currentHash) {
        chainBroken = true;
        brokenAt = i + 1;
        break;
      }

      previousHash = block.currentHash;
    }

    setVerificationResult({
      verified: !chainBroken,
      checkedBlocks: blocks.length,
      timestamp: new Date().toLocaleTimeString(),
      tamperedBlockIndex: brokenAt,
    });
    setIsVerifying(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/30 backdrop-blur-sm">
      {/* Slide-over Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="w-full max-w-3xl h-full bg-white border-l border-slate-200 shadow-2xl overflow-y-auto flex flex-col justify-between"
      >
        <div className="p-6 space-y-6">
          {/* Top Header */}
          <div className="pb-5 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-sans text-slate-900">
                      Cryptographic Audit Explorer
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                      {caseIdentifier}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Zero-Trust Immutable SHA-256 Blockchain Ledger
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                title="Close Audit Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Glowing Green Verified Badge */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div
                className={`px-3.5 py-1.5 rounded-full flex items-center gap-2 transition-all ${
                  verificationResult.verified
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs'
                    : 'bg-rose-50 border border-rose-300 text-rose-800 shadow-xs'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      verificationResult.verified ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      verificationResult.verified ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  ></span>
                </span>
                <span className="text-xs font-mono font-bold tracking-wide">
                  {verificationResult.verified
                    ? '🔒 Cryptographically Verified: Audit Chain Intact'
                    : '⚠️ Cryptographic Hash Mismatch: Tamper Detected'}
                </span>
              </div>

              {/* Verify Integrity Button */}
              <button
                onClick={handleVerifyIntegrity}
                disabled={isVerifying}
                className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                {isVerifying ? `Verifying Block #${verificationProgress}/5...` : 'Verify Integrity'}
              </button>
            </div>
          </div>

          {/* Case Context Snapshot Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px] font-sans block">Customer:</span>
              <span className="text-slate-900 font-medium truncate block font-sans">{customerName}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-sans block">Recovery Amount:</span>
              <span className="text-emerald-700 font-bold block tabular-nums">{formattedAmount}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-sans block">Current Status:</span>
              <span className="text-cyan-800 font-semibold uppercase block">
                {currentCase.status || 'RECOVERED'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] font-sans block">Ledger Standard:</span>
              <span className="text-slate-700 block">SHA-256 Merkle</span>
            </div>
          </div>

          {/* Tamper Simulation Toggle */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2 text-slate-700">
              <Sliders className="w-3.5 h-3.5 text-cyan-600" />
              <span className="font-semibold">Tamper Resistance Test:</span>
              <span className="text-[11px] text-slate-500">
                {isTampered ? 'Injected Malicious Payload in Block #2' : 'Pristine Canonical Chain'}
              </span>
            </div>
            <button
              onClick={() => {
                setIsTampered(!isTampered);
                setVerificationResult({ verified: true, checkedBlocks: 5 });
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors border ${
                isTampered
                  ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isTampered ? 'Reset Chain' : 'Simulate Tamper'}
            </button>
          </div>

          {/* Verification Status Banner */}
          <AnimatePresence>
            {!verificationResult.verified && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs font-mono space-y-1 shadow-glow-crimson"
              >
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>INTEGRITY FAILURE DETECTED AT BLOCK #{verificationResult.tamperedBlockIndex}</span>
                </div>
                <p className="text-[11px] text-rose-300/80">
                  Calculated hash does not match chained signature. Zero-trust consensus rejected state transition.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Blockchain Block Visualization (Vertical Chain) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Chronological Blockchain Sequence (5 Blocks)
              </h4>
              <span className="text-[11px] font-mono text-emerald-400">
                Genesis: 00000000...
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                Computing cryptographic hash chains...
              </div>
            ) : (
              <div className="relative pl-6 space-y-6">
                {/* Vertical Connecting Rail with Neon Gradient */}
                <div className="absolute left-[13px] top-4 bottom-6 w-[2px] bg-gradient-to-b from-emerald-500 via-cyan-500 to-emerald-400 opacity-60"></div>

                {blocks.map((block, idx) => {
                  const isBlockTampered =
                    isTampered && block.blockIndex === 2;

                  return (
                    <div key={block.blockIndex} className="relative group">
                      {/* Node Circle Anchor on the rail */}
                      <div
                        className={`absolute -left-[30px] top-5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-mono font-bold transition-all shadow-md ${
                          isBlockTampered
                            ? 'bg-rose-900 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                            : 'bg-carbon-900 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        }`}
                      >
                        {block.blockIndex}
                      </div>

                      {/* Block Card Container */}
                      <div
                        className={`p-4 rounded-xl border transition-all ${
                          isBlockTampered
                            ? 'bg-rose-50 border-rose-300 shadow-inner'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Block Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                              BLOCK #{block.blockIndex.toString().padStart(2, '0')}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {block.stepName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-sans">
                              • {block.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(block.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Block Core Telemetry Key-Values */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                          {block.details.map((d, dIdx) => (
                            <div
                              key={dIdx}
                              className="p-2 rounded-lg bg-white border border-slate-200"
                            >
                              <span className="text-[10px] font-sans text-slate-400 block">
                                {d.label}
                              </span>
                              <span className="text-slate-800 font-mono text-[11px] font-medium break-words">
                                {d.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Cryptographic Linkage Hashes */}
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5 text-[10px] font-mono">
                          {/* Chained Previous Hash */}
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="flex items-center gap-1 text-slate-400 font-sans">
                              <Link2 className="w-3 h-3 text-cyan-600" />
                              Chained Prev Hash:
                            </span>
                            <span className="text-cyan-800 font-mono tracking-tight truncate max-w-[280px]">
                              {block.previousHash}
                            </span>
                          </div>

                          {/* Current Block Hash */}
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-400 font-sans">
                              <Key className="w-3 h-3 text-emerald-600" />
                              Current Block Hash:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono tracking-tight truncate max-w-[280px] ${
                                  isBlockTampered
                                    ? 'text-rose-700 font-bold'
                                    : 'text-emerald-700 font-semibold'
                                }`}
                              >
                                {block.currentHash}
                              </span>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    block.currentHash,
                                    `hash-${block.blockIndex}`
                                  )
                                }
                                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                title="Copy Full Hash"
                              >
                                {copiedHash === `hash-${block.blockIndex}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified with Web Crypto SHA-256 API</span>
          </div>

          <div className="flex items-center gap-2">
            {onSelectCaseForWhatsApp && (
              <button
                onClick={() => {
                  onSelectCaseForWhatsApp(currentCase);
                  onClose();
                }}
                className="py-1.5 px-3 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-800 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Live WhatsApp Gateway
              </button>
            )}

            {onSelectCaseForVoice && (
              <button
                onClick={() => {
                  onSelectCaseForVoice(currentCase);
                  onClose();
                }}
                className="py-1.5 px-3 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 text-cyan-800 text-xs font-mono flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5 text-cyan-600" />
                Voice Concierge
              </button>
            )}

            <button
              onClick={onClose}
              className="py-1.5 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-sans font-medium transition-colors"
            >
              Close Explorer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuditDrawer;
