import { RecoveryCase } from '../models/RecoveryCase.js';
import { AuditService } from '../services/auditService.js';
import { MockGatewayService } from '../services/mockGateway.js';
import { AiDiagnosisService } from '../services/aiDiagnosisService.js';
import { isDbConnected } from '../config/db.js';

// High-fidelity Institutional In-Memory Seed State
export const inMemoryCases = [
  {
    caseId: 'RC-9842',
    transactionId: 'txn_9941a82b',
    customer: {
      id: 'cust_ent_001',
      name: 'Elena Rostova',
      email: 'elena.rostova@cloudscale.io',
      phone: '+1 (415) 890-4412',
      company: 'CloudScale Technologies Inc.',
      tier: 'Enterprise',
      mrr: 18500,
      timezone: 'America/New_York',
    },
    amount: 18500,
    currency: 'USD',
    status: 'action_required',
    riskScore: 78,
    failureCode: 'insufficient_funds',
    failureReason: 'Card issuer reported insufficient available balance (Code 51).',
    gateway: 'Stripe',
    attempts: 2,
    maxAttempts: 4,
    recoveredAmount: 0,
    aiDiagnosis: {
      rootCause: 'Issuing bank liquidity threshold reached ahead of quarterly accounts-payable sweep.',
      confidenceScore: 0.94,
      recommendedAction: 'Dispatch WhatsApp interactive invoice link with 1-click tokenized corporate wire option.',
      suggestedChannel: 'whatsapp_interactive',
      sentimentAnalysis: 'Flagship enterprise client; zero churn risk. Prompt respectful reminder advised.',
      optimalContactWindow: 'Immediate (within business operating window)',
      modelUsed: 'Groq Llama-3.3-70B',
      reasoningChain: [
        'Analyzed $18.5k recurring SaaS contract under Net-30 credit profile.',
        'Issuer code 51 flagged during automated nightly batch cycle.',
        'Channel recommendation: WhatsApp priority interactive card for Controller.'
      ],
    },
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 2),
        event: 'Subscription renewal billing attempted on primary Corporate Card',
        type: 'info',
        actor: 'Stripe Gateway Engine',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1.8),
        event: 'Issuer declined charge: insufficient_funds (Code 51)',
        type: 'warning',
        actor: 'JPMorgan Chase Card Switch',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1.5),
        event: 'AI Forensic Diagnosis generated root cause and channel strategy',
        type: 'ai_decision',
        actor: 'AI Forensic Diagnosis Engine',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 4),
    updatedAt: new Date(),
  },
  {
    caseId: 'RC-9843',
    transactionId: 'txn_7714f32c',
    customer: {
      id: 'cust_ent_002',
      name: 'Marcus Vance',
      email: 'm.vance@vanguardsec.com',
      phone: '+1 (212) 555-0193',
      company: 'Vanguard Cyber Systems',
      tier: 'Enterprise',
      mrr: 12400,
      timezone: 'America/New_York',
    },
    amount: 12400,
    currency: 'USD',
    status: 'diagnosing',
    riskScore: 64,
    failureCode: 'sca_required',
    failureReason: 'PSD2 3D Secure 2.2 challenge mandated by issuer authentication engine.',
    gateway: 'Adyen',
    attempts: 1,
    maxAttempts: 3,
    recoveredAmount: 0,
    aiDiagnosis: {
      rootCause: 'European cardholder switch triggered mandatory biometric step-up verification.',
      confidenceScore: 0.96,
      recommendedAction: 'Direct customer to biometric 3DS mobile challenge via SMS/WhatsApp push.',
      suggestedChannel: 'whatsapp_interactive',
      sentimentAnalysis: 'Strict enterprise procurement protocol; customer expects compliance verification prompt.',
      optimalContactWindow: 'Immediate push notification (active session window)',
      modelUsed: 'Gemini 2.5 Flash',
      reasoningChain: [
        'Detected European issuing BIN requiring Strong Customer Authentication.',
        'Bypassed silent retries to avoid soft-decline rate penalties.',
        'Dispatched pre-authenticated mobile verification ticket.'
      ],
    },
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 1),
        event: 'Adyen Payment Intent requires 3DS Authentication',
        type: 'warning',
        actor: 'Adyen Payment Engine',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 1.2),
    updatedAt: new Date(),
  },
  {
    caseId: 'RC-9844',
    transactionId: 'txn_3391b10e',
    customer: {
      id: 'cust_scl_003',
      name: 'Sophia Chen',
      email: 'schen@nexusdata.ai',
      phone: '+1 (650) 412-9871',
      company: 'Nexus Data Labs',
      tier: 'Scale',
      mrr: 6800,
      timezone: 'America/Los_Angeles',
    },
    amount: 6800,
    currency: 'USD',
    status: 'retrying',
    riskScore: 42,
    failureCode: 'gateway_timeout',
    failureReason: 'Visa Direct gateway timeout during settlement authorization handoff.',
    gateway: 'Checkout.com',
    attempts: 2,
    maxAttempts: 4,
    recoveredAmount: 0,
    aiDiagnosis: {
      rootCause: 'Upstream clearing switch intermittent latency spike. Zero risk of account default.',
      confidenceScore: 0.98,
      recommendedAction: 'Execute exponential backoff retry across secondary card acquirer.',
      suggestedChannel: 'webhook_retry',
      sentimentAnalysis: 'High reliability client; background silent retry optimal.',
      optimalContactWindow: 'T + 30m automatic silent retry',
      modelUsed: 'Autonomous FinTech Inference Engine (v4.2)',
      reasoningChain: [
        'Detected Visa Network 91 timeout code.',
        'Account standing in top 5th percentile.',
        'Silent retry scheduled on backup acquirer.'
      ],
    },
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 3),
        event: 'Network timeout recorded on primary settlement channel',
        type: 'warning',
        actor: 'Checkout.com Switch',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 0.5),
        event: 'Smart retry pipeline initiated queue step 2',
        type: 'info',
        actor: 'Autonomous Engine',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 3),
    updatedAt: new Date(),
  },
  {
    caseId: 'RC-9845',
    transactionId: 'txn_1204c88a',
    customer: {
      id: 'cust_grw_004',
      name: 'Alexander Wright',
      email: 'a.wright@hyperflux.co',
      phone: '+44 20 7946 0912',
      company: 'Hyperflux Robotics',
      tier: 'Growth',
      mrr: 4500,
      timezone: 'Europe/London',
    },
    amount: 4500,
    currency: 'USD',
    status: 'recovered',
    riskScore: 31,
    failureCode: 'card_velocity_exceeded',
    failureReason: 'Rolling 24h bank velocity ceiling reached during automated payroll run.',
    gateway: 'Stripe',
    attempts: 3,
    maxAttempts: 4,
    recoveredAmount: 4500,
    aiDiagnosis: {
      rootCause: 'Velocity check triggered on bank end; self-resolved after rolling window reset.',
      confidenceScore: 0.95,
      recommendedAction: 'Executed delayed retry post-midnight UTC.',
      suggestedChannel: 'webhook_retry',
      sentimentAnalysis: 'Healthy recurring customer.',
      optimalContactWindow: 'Completed',
      modelUsed: 'Autonomous FinTech Inference Engine (v4.2)',
      reasoningChain: ['Velocity counter reset confirmed.', 'Authorized with Zero Interruption.'],
    },
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 5),
        event: 'Card velocity limit triggered by issuer',
        type: 'warning',
        actor: 'Barclays Switch',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 1),
        event: 'Smart retry executed successfully. $4,500 fully recovered.',
        type: 'success',
        actor: 'Stripe Gateway Engine',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 6),
    updatedAt: new Date(),
  },
  {
    caseId: 'RC-9846',
    transactionId: 'txn_8812e99f',
    customer: {
      id: 'cust_ent_005',
      name: 'Devon Sterling',
      email: 'devon@sterlingcap.com',
      phone: '+1 (312) 441-2900',
      company: 'Sterling Capital Partners',
      tier: 'Enterprise',
      mrr: 24000,
      timezone: 'America/Chicago',
    },
    amount: 24000,
    currency: 'USD',
    status: 'escalated',
    riskScore: 89,
    failureCode: 'do_not_honor',
    failureReason: 'Bank response 05: Do Not Honor. Cardholder authorization block.',
    gateway: 'Stripe',
    attempts: 4,
    maxAttempts: 4,
    recoveredAmount: 0,
    aiDiagnosis: {
      rootCause: 'Corporate card fraud prevention lockdown initiated due to foreign IP session mismatch.',
      confidenceScore: 0.91,
      recommendedAction: 'Engage Autonomous Voice Recovery Agent or VIP account director immediately.',
      suggestedChannel: 'voice_agent_dispatch',
      sentimentAnalysis: 'Tier-1 High MRR Account. Requires high-touch, polite executive outreach.',
      optimalContactWindow: 'Immediate Phone Call (concierge desk)',
      modelUsed: 'Groq Llama-3.3-70B',
      reasoningChain: [
        'High value charge $24,000 flagged by Bank of America executive security desk.',
        'Silent retries strictly prohibited to preserve merchant rating.',
        'Voice agent call dispatched to verify purchase authenticity.'
      ],
    },
    timeline: [
      {
        timestamp: new Date(Date.now() - 3600000 * 8),
        event: 'Transaction declined with response code 05: Do Not Honor',
        type: 'critical',
        actor: 'BoA Card Switch',
      },
      {
        timestamp: new Date(Date.now() - 3600000 * 2),
        event: 'Escalated to Voice Agent Concierge Dispatch',
        type: 'warning',
        actor: 'Escalation Engine',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 8),
    updatedAt: new Date(),
  },
];

export const getCases = async (req, res) => {
  try {
    const { status, tier, search } = req.query;
    let results = isDbConnected ? await RecoveryCase.find().sort({ updatedAt: -1 }) : [...inMemoryCases];

    if (status && status !== 'all') {
      results = results.filter((c) => c.status === status);
    }
    if (tier && tier !== 'all') {
      results = results.filter((c) => c.customer?.tier === tier);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (c) =>
          c.caseId.toLowerCase().includes(q) ||
          c.customer?.name?.toLowerCase().includes(q) ||
          c.customer?.company?.toLowerCase().includes(q) ||
          c.failureCode?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    let foundCase = null;

    if (isDbConnected) {
      foundCase = await RecoveryCase.findOne({ caseId: id });
    } else {
      foundCase = inMemoryCases.find((c) => c.caseId === id || c.transactionId === id);
    }

    if (!foundCase) {
      return res.status(404).json({ success: false, message: `Recovery Case ${id} not found.` });
    }

    res.json({ success: true, data: foundCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerSmartRetry = async (req, res) => {
  try {
    const { id } = req.params;
    let target = inMemoryCases.find((c) => c.caseId === id);

    if (isDbConnected) {
      target = await RecoveryCase.findOne({ caseId: id });
    }

    if (!target) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    target.status = 'retrying';
    target.attempts = (target.attempts || 1) + 1;
    target.timeline.unshift({
      timestamp: new Date(),
      event: `Manual operator initiated Smart Retry (Attempt ${target.attempts}/${target.maxAttempts})`,
      type: 'info',
      actor: req.body?.operator || 'Lead Operator',
    });

    // Execute charge attempt on gateway
    const chargeResult = await MockGatewayService.processCharge({
      caseId: target.caseId,
      amount: target.amount,
      customer: target.customer,
      failureCode: target.failureCode,
      attemptNumber: target.attempts,
    });

    if (chargeResult.success) {
      target.status = 'recovered';
      target.recoveredAmount = target.amount;
      target.timeline.unshift({
        timestamp: new Date(),
        event: `Charge approved! Succeeded on ${target.gateway} ($${target.amount})`,
        type: 'success',
        actor: `${target.gateway} Acquirer Switch`,
      });

      await AuditService.record({
        caseId: target.caseId,
        action: 'GATEWAY_CHARGE_SUCCEEDED',
        actor: 'OPERATOR_DISPATCH',
        category: 'GATEWAY',
        details: { amount: target.amount, chargeId: chargeResult.chargeId },
      });
    } else {
      target.status = target.attempts >= target.maxAttempts ? 'escalated' : 'action_required';
      target.timeline.unshift({
        timestamp: new Date(),
        event: `Retry declined: ${chargeResult.failureMessage}`,
        type: 'critical',
        actor: `${target.gateway} Acquirer Switch`,
      });

      await AuditService.record({
        caseId: target.caseId,
        action: 'GATEWAY_CHARGE_FAILED',
        actor: 'OPERATOR_DISPATCH',
        category: 'GATEWAY',
        details: { failureCode: chargeResult.failureCode, message: chargeResult.failureMessage },
      });
    }

    target.updatedAt = new Date();
    if (isDbConnected) {
      await target.save();
    }

    // Broadcast updated state to all connected clients
    if (req.app.get('io')) {
      req.app.get('io').emit('case:updated', target);
    }

    res.json({ success: true, result: chargeResult, data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const triggerAiDiagnosis = async (req, res) => {
  try {
    const { id } = req.params;
    let target = inMemoryCases.find((c) => c.caseId === id);

    if (isDbConnected) {
      target = await RecoveryCase.findOne({ caseId: id });
    }

    if (!target) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const diagnosis = await AiDiagnosisService.diagnoseCase(target);
    target.aiDiagnosis = diagnosis;
    target.updatedAt = new Date();
    target.timeline.unshift({
      timestamp: new Date(),
      event: `Deep AI Diagnosis executed (${diagnosis.modelUsed})`,
      type: 'ai_decision',
      actor: diagnosis.modelUsed,
      notes: diagnosis.recommendedAction,
    });

    if (isDbConnected) {
      await target.save();
    }

    await AuditService.record({
      caseId: target.caseId,
      action: 'AI_DIAGNOSIS_COMPLETED',
      actor: diagnosis.modelUsed,
      category: 'AI_INFERENCE',
      details: diagnosis,
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('case:updated', target);
    }

    res.json({ success: true, diagnosis, data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMetrics = async (req, res) => {
  try {
    const cases = isDbConnected ? await RecoveryCase.find() : inMemoryCases;

    const totalAtRisk = cases.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalRecovered = cases
      .filter((c) => c.status === 'recovered')
      .reduce((sum, c) => sum + (c.recoveredAmount || c.amount || 0), 0);
    const activePipeline = totalAtRisk - totalRecovered;
    const recoveryRate = totalAtRisk > 0 ? ((totalRecovered / totalAtRisk) * 100).toFixed(1) : 0;

    const statusCounts = {
      action_required: cases.filter((c) => c.status === 'action_required').length,
      retrying: cases.filter((c) => c.status === 'retrying').length,
      diagnosing: cases.filter((c) => c.status === 'diagnosing').length,
      recovered: cases.filter((c) => c.status === 'recovered').length,
      escalated: cases.filter((c) => c.status === 'escalated').length,
    };

    res.json({
      success: true,
      data: {
        totalAtRisk,
        totalRecovered,
        activePipeline,
        recoveryRate: Number(recoveryRate),
        statusCounts,
        activeCasesCount: cases.length,
        avgRiskScore: Math.round(cases.reduce((sum, c) => sum + (c.riskScore || 50), 0) / (cases.length || 1)),
        avgConfidence: 94.6,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
