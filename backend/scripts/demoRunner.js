/**
 * Automated Pitch Flow (180 Seconds) Demo Runner
 * 
 * Timeline:
 * T+0s:  Reset database to baseline (₹0 at risk, ₹5,40,000 recovered).
 * T+5s:  Auto-inject Case #1: Rahul Sharma — ₹4,999 HDFC UPI failure (NPCI_BANK_DOWNTIME).
 * T+12s: Terminal streams Gemini diagnosis and chooses UPI Auto-Switch. Retries and verifies as RECOVERED.
 * T+25s: Auto-inject Case #2: Priya Patel — ₹8,499 Abandoned cart (INSUFFICIENT_FUNDS).
 * T+32s: Safety engine triggers 5% discount rule. Emits WhatsApp link to the phone simulator.
 * T+45s: Auto-inject Case #3: TechCorp India — ₹1,80,000 Overdue Invoice.
 * T+50s: Safety engine halts automated retry (Amount > ₹50,000) and displays the "Human Approval Required" modal.
 * User clicks [ Approve Voice Call ], triggering the speech synthesis flow.
 */

import http from 'http';

// Demo State Tracker
let activeDemoTimer = null;
let activeInterval = null;
let currentDemoState = {
  isRunning: false,
  elapsedSeconds: 0,
  totalSeconds: 180,
  stage: 'IDLE',
  message: 'Demo runner standing by.',
  activeCase: null,
  humanApprovalRequired: false,
};

let ioRef = null;
let inMemoryCasesRef = null;
let recoveryCaseModelRef = null;
let isDbConnectedRef = false;
let auditServiceRef = null;

/**
 * Configure Demo Runner with server dependencies
 */
export const initDemoRunner = ({
  io,
  inMemoryCases,
  RecoveryCase,
  isDbConnected,
  AuditService,
}) => {
  ioRef = io;
  inMemoryCasesRef = inMemoryCases;
  recoveryCaseModelRef = RecoveryCase;
  isDbConnectedRef = isDbConnected;
  auditServiceRef = AuditService;
};

export const getDemoStatus = () => currentDemoState;

/**
 * Execute the 180-second Automated Pitch Demo
 */
export const startPitchDemo = async (customIo = ioRef) => {
  const io = customIo || ioRef;
  if (currentDemoState.isRunning) {
    stopPitchDemo();
  }

  currentDemoState = {
    isRunning: true,
    elapsedSeconds: 0,
    totalSeconds: 180,
    stage: 'STARTING',
    message: 'Starting 180s Automated Pitch Demo...',
    activeCase: null,
    humanApprovalRequired: false,
  };

  console.log('\n======================================================');
  console.log('🚀 INITIATING AUTOMATED PITCH DEMO (180 SECONDS)');
  console.log('======================================================\n');

  // Broadcast demo start
  if (io) {
    io.emit('demo:status', currentDemoState);
  }

  // T+0s: Reset database to baseline (₹0 at risk, ₹5,40,000 recovered)
  await resetDatabaseToBaseline(io);

  let case1 = null;
  let case2 = null;
  let case3 = null;

  // Track elapsed time with 1-second ticks
  activeInterval = setInterval(() => {
    if (!currentDemoState.isRunning) {
      clearInterval(activeInterval);
      return;
    }
    currentDemoState.elapsedSeconds += 1;
    if (io) {
      io.emit('demo:tick', {
        elapsed: currentDemoState.elapsedSeconds,
        total: currentDemoState.totalSeconds,
        stage: currentDemoState.stage,
      });
    }

    if (currentDemoState.elapsedSeconds >= currentDemoState.totalSeconds) {
      currentDemoState.isRunning = false;
      currentDemoState.stage = 'COMPLETED';
      currentDemoState.message = 'Pitch Demo completed successfully (180s full rehearsal).';
      if (io) io.emit('demo:status', currentDemoState);
      clearInterval(activeInterval);
    }
  }, 1000);

  // Scheduled Milestones
  const scheduleMilestone = (delayMs, action) => {
    return setTimeout(async () => {
      if (!currentDemoState.isRunning) return;
      try {
        await action();
      } catch (err) {
        console.error('[DemoRunner Error]:', err);
      }
    }, delayMs);
  };

  // --------------------------------------------------------------------------
  // T+5s: Auto-inject Case #1: Rahul Sharma — ₹4,999 HDFC UPI failure
  // --------------------------------------------------------------------------
  scheduleMilestone(5000, async () => {
    currentDemoState.stage = 'CASE_1_INJECTION';
    currentDemoState.message = 'T+5s: Auto-injecting Case #1: Rahul Sharma — ₹4,999 (NPCI_BANK_DOWNTIME)';

    console.log('[T+5s] ⚠️  Injecting Case #1: Rahul Sharma — ₹4,999 HDFC UPI failure');

    case1 = {
      caseId: 'RCV-10941',
      caseNumber: 'RCV-10941',
      customer: {
        id: 'cust_rahul_01',
        name: 'Rahul Sharma',
        phone: '+91 98765 43210',
        email: 'rahul.sharma@corp.in',
        company: 'Apex Retail Tech',
        vpa: 'rahul.sharma@okhdfcbank',
        previousSuccessCount: 14,
        ltv: 42000,
      },
      transaction: {
        amount: 4999,
        currency: 'INR',
        paymentMethod: 'UPI',
        errorCode: 'NPCI_BANK_DOWNTIME',
        errorDescription: 'HDFC issuing bank 3D-Secure switch timeout (>4200ms)',
        gateway: 'RAZORPAY_MOCK',
      },
      amount: 4999,
      category: 'FAILED_PAYMENT',
      status: 'DETECTED',
      failureCode: 'NPCI_BANK_DOWNTIME',
      failureReason: 'HDFC bank timeout',
      gateway: 'HDFC Bank',
      riskScore: 28,
      attempts: 1,
      maxAttempts: 3,
      recoveredAmount: 0,
      timeline: [
        {
          timestamp: new Date(),
          event: 'Inbound UPI payment decline: NPCI_BANK_DOWNTIME (HDFC 3DS)',
          type: 'warning',
          actor: 'Razorpay Gateway Sensor',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (inMemoryCasesRef) {
      inMemoryCasesRef.unshift(case1);
    }
    if (isDbConnectedRef && recoveryCaseModelRef) {
      try {
        await recoveryCaseModelRef.create(case1);
      } catch (_) {}
    }

    currentDemoState.activeCase = case1;

    if (io) {
      io.emit('case:new', case1);
      io.emit('demo:step', {
        t: 5,
        title: 'Case #1 Ingested: Rahul Sharma',
        amount: 4999,
        caseId: 'RCV-10941',
        error: 'NPCI_BANK_DOWNTIME',
      });
      io.emit('agent:step', {
        step: 'DETECTION',
        caseId: 'RCV-10941',
        agentName: 'INGESTION_AGENT',
        status: 'DETECTED',
        message: 'Inbound payment decline ingested: [NPCI_BANK_DOWNTIME] for ₹4,999 (Rahul Sharma)',
        payload: case1,
      });
      io.emit('terminal:log', {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'detection',
        category: 'INGESTION',
        message: '[T+5s] INGESTION_AGENT: Ingested failure for Rahul Sharma (₹4,999) - HDFC Bank 3DS Switch Timeout',
        caseId: 'RCV-10941',
      });
    }
  });

  // --------------------------------------------------------------------------
  // T+12s: Terminal streams Gemini diagnosis and chooses UPI Auto-Switch. Retries and verifies as RECOVERED.
  // --------------------------------------------------------------------------
  scheduleMilestone(12000, async () => {
    currentDemoState.stage = 'CASE_1_RECOVERED';
    currentDemoState.message = 'T+12s: Gemini diagnosis chose UPI Auto-Switch. Retried & verified RECOVERED!';

    console.log('[T+12s] 🤖 Gemini Diagnosis -> UPI Auto-Switch -> Verified as RECOVERED (₹4,999)');

    if (case1) {
      case1.status = 'RECOVERED';
      case1.recoveredAmount = 4999;
      case1.aiDiagnosis = {
        rootCause: 'Issuing bank liquidity threshold reached ahead of quarterly sweep (Code 51/Timeout)',
        confidenceScore: 0.96,
        recommendedAction: 'UPI_SWITCH',
        suggestedChannel: 'upi_auto_switch',
        modelUsed: 'Gemini 2.5 Flash',
      };
      case1.timeline.unshift({
        timestamp: new Date(),
        event: 'Gemini 2.5 Flash diagnosis: Switch latency identified. Auto-switched to Google Pay / PhonePe fast-path.',
        type: 'info',
        actor: 'Dual-AI Reasoning Core',
      });
      case1.timeline.unshift({
        timestamp: new Date(),
        event: 'Settlement confirmed! ₹4,999 recovered via UPI Alternate Rail.',
        type: 'success',
        actor: 'NPCI Fast-Path Switch',
      });
    }

    if (isDbConnectedRef && recoveryCaseModelRef) {
      try {
        await recoveryCaseModelRef.updateOne(
          { caseId: 'RCV-10941' },
          { $set: { status: 'RECOVERED', recoveredAmount: 4999, aiDiagnosis: case1.aiDiagnosis } }
        );
      } catch (_) {}
    }

    if (io) {
      io.emit('agent:step', {
        step: 'DIAGNOSIS',
        caseId: 'RCV-10941',
        agentName: 'Gemini 2.5 Flash',
        status: 'DIAGNOSED',
        message: 'Gemini identified HDFC issuing node latency (>4200ms). Chose automated failover: [UPI_SWITCH].',
        payload: { action: 'UPI_SWITCH', confidence: 0.96 },
      });
      io.emit('agent:step', {
        step: 'RECOVERY',
        caseId: 'RCV-10941',
        agentName: 'SETTLEMENT_SWITCH',
        status: 'RECOVERED',
        message: 'Settlement confirmed! ₹4,999 recovered via UPI Auto-Switch (Google Pay / PhonePe).',
        payload: { recoveredAmount: 4999, channel: 'UPI_SWITCH' },
      });
      io.emit('agent:step', {
        step: 'AUDIT',
        caseId: 'RCV-10941',
        agentName: 'CRYPTOGRAPHIC_AUDIT_LEDGER',
        status: 'SEALED',
        message: 'Audit chain cryptographically sealed (SHA-256 chain integrity: VERIFIED)',
        payload: { chainValid: true },
      });
      io.emit('case:updated', case1);
      io.emit('demo:step', {
        t: 12,
        title: 'Case #1 Recovered: ₹4,999 via UPI Auto-Switch',
        caseId: 'RCV-10941',
        status: 'RECOVERED',
      });
      io.emit('terminal:log', {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'recovery',
        category: 'SETTLEMENT',
        message: '[T+12s] RECOVERY CONFIRMED: Case RCV-10941 (Rahul Sharma) recovered for ₹4,999 via UPI Auto-Switch. SHA-256 Chain Intact.',
        caseId: 'RCV-10941',
      });
    }
  });

  // --------------------------------------------------------------------------
  // T+25s: Auto-inject Case #2: Priya Patel — ₹8,499 Abandoned cart (INSUFFICIENT_FUNDS)
  // --------------------------------------------------------------------------
  scheduleMilestone(25000, async () => {
    currentDemoState.stage = 'CASE_2_INJECTION';
    currentDemoState.message = 'T+25s: Auto-injecting Case #2: Priya Patel — ₹8,499 (INSUFFICIENT_FUNDS)';

    console.log('[T+25s] ⚠️  Injecting Case #2: Priya Patel — ₹8,499 Abandoned cart (INSUFFICIENT_FUNDS)');

    case2 = {
      caseId: 'RCV-20881',
      caseNumber: 'RCV-20881',
      customer: {
        id: 'cust_priya_02',
        name: 'Priya Patel',
        phone: '+91 98201 55432',
        email: 'priya.patel@trendkart.in',
        company: 'TrendKart Digital',
        vpa: 'priyap@icici',
        previousSuccessCount: 9,
        ltv: 38000,
      },
      transaction: {
        amount: 8499,
        currency: 'INR',
        paymentMethod: 'UPI',
        errorCode: 'INSUFFICIENT_FUNDS',
        errorDescription: 'Issuing bank declined charge: Available balance below debit request (Code 51)',
        gateway: 'RAZORPAY_MOCK',
      },
      amount: 8499,
      category: 'ABANDONED_CHECKOUT',
      status: 'DETECTED',
      failureCode: 'INSUFFICIENT_FUNDS',
      failureReason: 'Insufficient available balance at bank',
      gateway: 'ICICI Bank',
      riskScore: 35,
      attempts: 1,
      maxAttempts: 3,
      recoveredAmount: 0,
      timeline: [
        {
          timestamp: new Date(),
          event: 'Inbound checkout abandonment: INSUFFICIENT_FUNDS (Code 51)',
          type: 'warning',
          actor: 'Razorpay Gateway Sensor',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (inMemoryCasesRef) {
      inMemoryCasesRef.unshift(case2);
    }
    if (isDbConnectedRef && recoveryCaseModelRef) {
      try {
        await recoveryCaseModelRef.create(case2);
      } catch (_) {}
    }

    currentDemoState.activeCase = case2;

    if (io) {
      io.emit('case:new', case2);
      io.emit('demo:step', {
        t: 25,
        title: 'Case #2 Ingested: Priya Patel',
        amount: 8499,
        caseId: 'RCV-20881',
        error: 'INSUFFICIENT_FUNDS',
      });
      io.emit('agent:step', {
        step: 'DETECTION',
        caseId: 'RCV-20881',
        agentName: 'INGESTION_AGENT',
        status: 'DETECTED',
        message: 'Inbound payment decline ingested: [INSUFFICIENT_FUNDS] for ₹8,499 (Priya Patel)',
        payload: case2,
      });
      io.emit('terminal:log', {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'detection',
        category: 'INGESTION',
        message: '[T+25s] INGESTION_AGENT: Ingested failure for Priya Patel (₹8,499) - Code 51 Insufficient Funds',
        caseId: 'RCV-20881',
      });
    }
  });

  // --------------------------------------------------------------------------
  // T+32s: Safety engine triggers 5% discount rule. Emits WhatsApp link to the phone simulator.
  // --------------------------------------------------------------------------
  scheduleMilestone(32000, async () => {
    currentDemoState.stage = 'CASE_2_WHATSAPP';
    currentDemoState.message = 'T+32s: Safety engine triggered 5% discount rule. Emitted WhatsApp link to simulator!';

    console.log('[T+32s] 💬 Safety engine -> 5% discount rule -> Emitting WhatsApp link to phone simulator');

    if (case2) {
      case2.status = 'DIAGNOSING';
      case2.discountApplied = 5;
      case2.aiDiagnosis = {
        rootCause: 'Issuing bank balance floor. Customer LTV (₹38,000) qualifies for 5% discount incentive.',
        confidenceScore: 0.94,
        recommendedAction: 'DISCOUNT_OFFER',
        suggestedChannel: 'whatsapp_interactive',
        modelUsed: 'Groq Llama-3.3-70B',
      };
      case2.timeline.unshift({
        timestamp: new Date(),
        event: 'Safety Policy Rule #3 approved: Customer LTV > ₹15,000. 5% concession coupon applied (-₹425).',
        type: 'info',
        actor: 'Bounded Safety Engine',
      });
      case2.timeline.unshift({
        timestamp: new Date(),
        event: 'WhatsApp Interactive 1-Click Pay Link dispatched with cart reservation.',
        type: 'info',
        actor: 'Omnichannel WhatsApp Dispatcher',
      });
    }

    if (isDbConnectedRef && recoveryCaseModelRef) {
      try {
        await recoveryCaseModelRef.updateOne(
          { caseId: 'RCV-20881' },
          { $set: { discountApplied: 5, aiDiagnosis: case2.aiDiagnosis } }
        );
      } catch (_) {}
    }

    if (io) {
      io.emit('agent:step', {
        step: 'POLICY_CHECK',
        caseId: 'RCV-20881',
        agentName: 'BOUNDED_SAFETY_POLICY_ENGINE',
        status: 'POLICY_PASSED',
        message: 'Policy Rule #3 Qualified: LTV ₹38,000 > ₹15,000 threshold. Applied 5% discount (-₹425). New total: ₹8,074.',
        payload: { discountPercentage: 5, discountedTotal: 8074 },
      });
      io.emit('demo:whatsapp_trigger', {
        caseItem: case2,
        customerName: 'Priya Patel',
        originalAmount: 8499,
        discountedAmount: 8074,
        message: 'Hi Priya, your cart reservation of ₹8,499 was paused due to an ICICI Bank balance decline. We’ve reserved your items and applied an instant 5% recovery discount (Code: SAVE5). Pay ₹8,074 via 1-Click UPI below!',
      });
      io.emit('case:updated', case2);
      io.emit('demo:step', {
        t: 32,
        title: 'Case #2: 5% Discount Dispatched via WhatsApp',
        caseId: 'RCV-20881',
        action: 'WHATSAPP_SIMULATOR_DOCK',
      });
      io.emit('terminal:log', {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'whatsapp',
        category: 'OMNICHANNEL',
        message: '[T+32s] WHATSAPP_DISPATCH: Interactive 1-Click paylink (5% discount) delivered to Priya Patel (+91 98201 55432). Simulator Docked.',
        caseId: 'RCV-20881',
      });
    }
  });

  // --------------------------------------------------------------------------
  // T+45s: Auto-inject Case #3: TechCorp India — ₹1,80,000 Overdue Invoice.
  // --------------------------------------------------------------------------
  scheduleMilestone(45000, async () => {
    currentDemoState.stage = 'CASE_3_INJECTION';
    currentDemoState.message = 'T+45s: Auto-injecting Case #3: TechCorp India — ₹1,80,000 Overdue Invoice';

    console.log('[T+45s] ⚠️  Injecting Case #3: TechCorp India — ₹1,80,000 Overdue Invoice');

    case3 = {
      caseId: 'RCV-30442',
      caseNumber: 'RCV-30442',
      customer: {
        id: 'cust_techcorp_03',
        name: 'TechCorp India',
        phone: '+91 99887 76655',
        email: 'finance@techcorp.in',
        company: 'TechCorp Enterprise Solutions Ltd',
        vpa: 'techcorp@hdfcbank',
        previousSuccessCount: 38,
        ltv: 780000,
      },
      transaction: {
        amount: 180000,
        currency: 'INR',
        paymentMethod: 'INVOICE',
        errorCode: 'EXCEEDS_AUTONOMOUS_LIMIT',
        errorDescription: 'Transaction amount ₹1,80,000 exceeds autonomous execution ceiling (> ₹50,000)',
        gateway: 'RAZORPAY_MOCK',
      },
      amount: 180000,
      category: 'OVERDUE_INVOICE',
      status: 'DETECTED',
      failureCode: 'EXCEEDS_AUTONOMOUS_LIMIT',
      failureReason: 'Corporate card 05 block: Exceeds automated execution ceiling',
      gateway: 'Corporate Banking Acquirer',
      riskScore: 84,
      attempts: 1,
      maxAttempts: 3,
      recoveredAmount: 0,
      timeline: [
        {
          timestamp: new Date(),
          event: 'Inbound high-value invoice payment failure: ₹1,80,000 (TechCorp India)',
          type: 'warning',
          actor: 'Enterprise Ingestion Sensor',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (inMemoryCasesRef) {
      inMemoryCasesRef.unshift(case3);
    }
    if (isDbConnectedRef && recoveryCaseModelRef) {
      try {
        await recoveryCaseModelRef.create(case3);
      } catch (_) {}
    }

    currentDemoState.activeCase = case3;

    if (io) {
      io.emit('case:new', case3);
      io.emit('demo:step', {
        t: 45,
        title: 'Case #3 Ingested: TechCorp India (₹1,80,000)',
        amount: 180000,
        caseId: 'RCV-30442',
        category: 'OVERDUE_INVOICE',
      });
      io.emit('agent:step', {
        step: 'DETECTION',
        caseId: 'RCV-30442',
        agentName: 'INGESTION_AGENT',
        status: 'DETECTED',
        message: 'Inbound payment decline ingested: ₹1,80,000 (TechCorp India) - High Financial Exposure',
        payload: case3,
      });
      io.emit('terminal:log', {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'detection',
        category: 'INGESTION',
        message: '[T+45s] INGESTION_AGENT: Ingested high-value invoice failure for TechCorp India (₹1,80,000).',
        caseId: 'RCV-30442',
      });
    }
  });

  // --------------------------------------------------------------------------
  // T+50s: Safety engine halts automated retry (Amount > ₹50,000) and displays the "Human Approval Required" modal.
  // --------------------------------------------------------------------------
  scheduleMilestone(50000, async () => {
    currentDemoState.stage = 'CASE_3_HUMAN_APPROVAL';
    currentDemoState.humanApprovalRequired = true;
    currentDemoState.message = 'T+50s: Bounded Safety halted retry (₹1,80,000 > ₹50,000). Human Approval Modal displayed!';

    console.log('[T+50s] 🛑 Bounded Safety Rule #1: HALTED RETRY (₹1,80,000 > ₹50,000). Human Approval Required!');

    if (case3) {
      case3.status = 'AWAITING_HUMAN';
      case3.aiDiagnosis = {
        rootCause: 'Corporate card fraud prevention block. Foreign IP mismatch detected during payroll run.',
        confidenceScore: 0.92,
        recommendedAction: 'HUMAN_ESCALATE',
        suggestedChannel: 'voice_agent_dispatch',
        modelUsed: 'Gemini 2.5 Flash / Groq Llama 3.3',
      };
      case3.timeline.unshift({
        timestamp: new Date(),
        event: 'Bounded Safety Rule #1 Triggered: Amount ₹1,80,000 exceeds ₹50,000 limit. Autonomous retry halted.',
        type: 'critical',
        actor: 'Bounded Safety Policy Engine',
      });
      case3.timeline.unshift({
        timestamp: new Date(),
        event: 'Quarantined for Operator Approval: Dispatch VIP AI Voice Concierge to Finance Director.',
        type: 'warning',
        actor: 'Escalation Supervisor',
      });
    }

    if (isDbConnectedRef && recoveryCaseModelRef) {
      try {
        await recoveryCaseModelRef.updateOne(
          { caseId: 'RCV-30442' },
          { $set: { status: 'AWAITING_HUMAN', aiDiagnosis: case3.aiDiagnosis } }
        );
      } catch (_) {}
    }

    if (io) {
      io.emit('agent:step', {
        step: 'POLICY_CHECK',
        caseId: 'RCV-30442',
        agentName: 'BOUNDED_SAFETY_POLICY_ENGINE',
        status: 'POLICY_RESTRICTED',
        message: 'POLICY_RULE_1_TRIGGERED: High financial exposure (₹1,80,000 > ₹50,000 limit). Automated retries halted; mandatory operator approval required.',
        payload: { isPermitted: false, finalAction: 'HUMAN_ESCALATE' },
      });
      io.emit('demo:human_approval_required', {
        caseItem: case3,
        caseId: 'RCV-30442',
        customerName: 'TechCorp India',
        company: 'TechCorp Enterprise Solutions Ltd',
        amount: 180000,
        reason: 'Amount exceeds ₹50,000 bounded safety ceiling. Operator authorization needed to dispatch AI Voice Concierge.',
      });
      io.emit('case:updated', case3);
      io.emit('demo:step', {
        t: 50,
        title: 'Case #3: Human Approval Required Modal Displayed',
        caseId: 'RCV-30442',
        action: 'HUMAN_APPROVAL_MODAL',
      });
      io.emit('terminal:log', {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'safety',
        category: 'GOVERNANCE',
        message: '[T+50s] BOUNDED SAFETY QUARANTINE: Case RCV-30442 (₹1,80,000) halted. Displayed "Human Approval Required" modal. Awaiting [Approve Voice Call].',
        caseId: 'RCV-30442',
      });
    }
  });

  return currentDemoState;
};

/**
 * Handle user click on [ Approve Voice Call ]
 */
export const approveVoiceCallDemo = async (customIo = ioRef) => {
  const io = customIo || ioRef;
  console.log('[DemoRunner] 📞 User clicked [ Approve Voice Call ]! Triggering speech synthesis flow...');

  currentDemoState.humanApprovalRequired = false;
  currentDemoState.stage = 'VOICE_CALL_APPROVED';
  currentDemoState.message = 'User approved voice call. Voice Agent speech synthesis initiated!';

  const targetCase = currentDemoState.activeCase || {
    caseId: 'RCV-30442',
    caseNumber: 'RCV-30442',
    customer: { name: 'Vikramaditya Singhania', company: 'TechCorp India', phone: '+91 99887 76655' },
    amount: 180000,
    status: 'RECOVERED',
  };

  targetCase.status = 'RECOVERED';
  targetCase.recoveredAmount = 180000;

  if (targetCase.timeline) {
    targetCase.timeline.unshift({
      timestamp: new Date(),
      event: 'Human operator signed off: [Approve Voice Call]. Dispatched Autonomous Voice Concierge.',
      type: 'info',
      actor: 'Human Operator Interface',
    });
    targetCase.timeline.unshift({
      timestamp: new Date(),
      event: 'Voice Concierge engaged Vikramaditya Singhania. Payment re-authorized via corporate wire.',
      type: 'success',
      actor: 'AI Voice Concierge',
    });
  }

  if (isDbConnectedRef && recoveryCaseModelRef) {
    try {
      await recoveryCaseModelRef.updateOne(
        { $or: [{ caseId: 'RCV-30442' }, { caseNumber: 'RCV-30442' }] },
        { $set: { status: 'RECOVERED', recoveredAmount: 180000 } }
      );
    } catch (_) {}
  }

  if (io) {
    io.emit('agent:step', {
      step: 'EXECUTION',
      caseId: 'RCV-30442',
      agentName: 'HUMAN_OPERATOR_INTERFACE',
      status: 'APPROVED',
      message: 'Operator authorization granted: Approved AI Voice Concierge dispatch for ₹1,80,000.',
      payload: { operator: 'Principal Architect', action: 'DISPATCH_VOICE_CONCIERGE' },
    });
    io.emit('demo:voice_trigger', {
      caseItem: targetCase,
      customerName: 'Vikramaditya Singhania',
      company: 'TechCorp India',
      amount: 180000,
      speechText:
        'Hello Vikramaditya, this is the Priority Settlement Concierge for TechCorp India. We noticed your quarterly invoice of ₹1,80,000 was temporarily held. I can immediately execute a real-time corporate wire release or re-route through your backup corporate account. Would you like me to authorize this now?',
    });
    io.emit('case:updated', targetCase);
    io.emit('demo:step', {
      t: currentDemoState.elapsedSeconds || 52,
      title: 'Voice Call Approved: TechCorp India (₹1,80,000)',
      action: 'SPEECH_SYNTHESIS_STARTED',
    });
    io.emit('terminal:log', {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'voice',
      category: 'SPEECH_SYNTHESIS',
      message: '[DEMO ACTION] Voice Concierge active with TechCorp India. Speech synthesis started. Case RCV-30442 verified RECOVERED.',
      caseId: 'RCV-30442',
    });
  }

  return { success: true, case: targetCase };
};

/**
 * Stop or reset active demo
 */
export const stopPitchDemo = () => {
  if (activeInterval) clearInterval(activeInterval);
  currentDemoState.isRunning = false;
  currentDemoState.stage = 'STOPPED';
  currentDemoState.message = 'Pitch demo stopped by operator.';
  if (ioRef) ioRef.emit('demo:status', currentDemoState);
  return currentDemoState;
};

/**
 * Reset database to baseline (₹0 at risk, ₹5,40,000 recovered)
 */
export const resetDatabaseToBaseline = async (io = ioRef) => {
  console.log('[T+0s] 🔄 Resetting database to baseline: ₹0 at risk, ₹5,40,000 recovered.');

  // Baseline seed cases (all fully settled and recovered)
  const baselineCases = [
    {
      caseId: 'RCV-BASE-01',
      caseNumber: 'RCV-BASE-01',
      customer: {
        id: 'cust_base_1',
        name: 'Aarav Mehta',
        phone: '+91 98110 12345',
        email: 'aarav.m@zetafin.in',
        company: 'Zeta Financial Corp',
        vpa: 'aarav@okhdfcbank',
      },
      transaction: { amount: 240000, currency: 'INR', paymentMethod: 'INVOICE', gateway: 'RAZORPAY_MOCK' },
      amount: 240000,
      category: 'OVERDUE_INVOICE',
      status: 'RECOVERED',
      recoveredAmount: 240000,
      riskScore: 21,
      timeline: [{ timestamp: new Date(Date.now() - 3600000), event: 'Settlement confirmed: ₹2,40,000', type: 'success', actor: 'Settlement Switch' }],
      createdAt: new Date(Date.now() - 3600000 * 2),
      updatedAt: new Date(Date.now() - 3600000),
    },
    {
      caseId: 'RCV-BASE-02',
      caseNumber: 'RCV-BASE-02',
      customer: {
        id: 'cust_base_2',
        name: 'Meera Nambiar',
        phone: '+91 98220 54321',
        email: 'meera@nambiar.io',
        company: 'Nambiar BioLabs',
        vpa: 'meera@icici',
      },
      transaction: { amount: 180000, currency: 'INR', paymentMethod: 'UPI', gateway: 'RAZORPAY_MOCK' },
      amount: 180000,
      category: 'FAILED_PAYMENT',
      status: 'RECOVERED',
      recoveredAmount: 180000,
      riskScore: 18,
      timeline: [{ timestamp: new Date(Date.now() - 7200000), event: 'Settlement confirmed: ₹1,80,000', type: 'success', actor: 'Settlement Switch' }],
      createdAt: new Date(Date.now() - 7200000 * 2),
      updatedAt: new Date(Date.now() - 7200000),
    },
    {
      caseId: 'RCV-BASE-03',
      caseNumber: 'RCV-BASE-03',
      customer: {
        id: 'cust_base_3',
        name: 'Ananya Deshmukh',
        phone: '+91 98330 98765',
        email: 'ananya@finpulse.co',
        company: 'FinPulse Software',
        vpa: 'ananya@axisbank',
      },
      transaction: { amount: 120000, currency: 'INR', paymentMethod: 'CARD', gateway: 'STRIPE_MOCK' },
      amount: 120000,
      category: 'SUBSCRIPTION_FAILURE',
      status: 'RECOVERED',
      recoveredAmount: 120000,
      riskScore: 15,
      timeline: [{ timestamp: new Date(Date.now() - 10800000), event: 'Settlement confirmed: ₹1,20,000', type: 'success', actor: 'Settlement Switch' }],
      createdAt: new Date(Date.now() - 10800000 * 2),
      updatedAt: new Date(Date.now() - 10800000),
    },
  ];

  if (inMemoryCasesRef) {
    inMemoryCasesRef.length = 0;
    inMemoryCasesRef.push(...baselineCases);
  }

  if (isDbConnectedRef && recoveryCaseModelRef) {
    try {
      await recoveryCaseModelRef.deleteMany({});
      await recoveryCaseModelRef.insertMany(baselineCases);
    } catch (e) {
      console.warn('[DemoRunner] DB reset warning:', e.message);
    }
  }

  const baselineMetrics = {
    totalRecovered: 540000,
    atRisk: 0,
    recoveryRate: 100,
    activeCases: 0,
    statusCounts: {
      RECOVERED: 3,
      DETECTED: 0,
      DIAGNOSING: 0,
      SCHEDULED: 0,
      AWAITING_HUMAN: 0,
      FAILED: 0,
    },
  };

  if (io) {
    io.emit('cases:reset', { cases: baselineCases, metrics: baselineMetrics });
    io.emit('terminal:log', {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      category: 'BASELINE',
      message: '[T+0s] DEMO RESET: Database reset to baseline (₹0 at risk, ₹5,40,000 recovered). All payment switches optimal.',
    });
  }

  return { baselineCases, baselineMetrics };
};

// ----------------------------------------------------------------------------
// CLI Entry Point (if invoked directly via node backend/scripts/demoRunner.js)
// ----------------------------------------------------------------------------
const isMain = process.argv[1] && process.argv[1].endsWith('demoRunner.js');
if (isMain) {
  const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
  console.log(`[CLI] Triggering demoRunner against server at ${SERVER_URL}...`);

  const req = http.request(
    `${SERVER_URL}/api/demo/start`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        console.log('[CLI] Server Response:', data);
      });
    }
  );
  req.on('error', (e) => {
    console.log('[CLI] Server offline, running autonomous in-process mock demo...');
    startPitchDemo();
  });
  req.end();
}
