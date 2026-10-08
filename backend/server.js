import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

import { connectDB, isDbConnected } from './config/db.js';
import { RecoveryCase } from './models/RecoveryCase.js';
import { AuditLog } from './models/AuditLog.js';
import {
  setAuditSocket,
  AuditService,
  createChainedAuditLog,
  verifyChainIntegrity,
} from './services/auditService.js';
import {
  diagnoseFailure,
  evaluatePolicySafety,
} from './services/aiDiagnosisService.js';
import {
  MockGatewayService,
  createScenarioData,
  executeRetry,
  SCENARIO_TYPES,
} from './services/mockGateway.js';
import { initScheduler } from './services/scheduler.js';
import {
  getCases,
  getCaseById,
  triggerSmartRetry,
  triggerAiDiagnosis,
  getMetrics,
  inMemoryCases,
} from './controllers/caseController.js';
import {
  simulateWhatsAppAction,
  simulateVoiceAgentTurn,
} from './controllers/simulationController.js';
import { askCopilot, streamCopilotChat } from './controllers/copilotController.js';
import {
  initDemoRunner,
  startPitchDemo,
  stopPitchDemo,
  getDemoStatus,
  approveVoiceCallDemo,
  resetDatabaseToBaseline,
} from './scripts/demoRunner.js';
import {
  initWhatsAppClient,
  setWhatsAppSocket,
  sendRecoveryWhatsApp,
  getWhatsAppStatus,
} from './services/whatsappClient.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import QRCode from 'qrcode';
import { DEMO_PHONE_NUMBERS, TEST_CUSTOMER_PROFILES } from './config/demoNumbers.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

app.set('io', io);
setAuditSocket(io);
setWhatsAppSocket(io);

// Initialize Automated Pitch Demo Runner
initDemoRunner({
  io,
  inMemoryCases,
  RecoveryCase,
  isDbConnected,
  AuditService,
});

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());

// Helper to broadcast agent steps across WebSocket
export const emitAgentStep = (ioInstance, { step, caseId, agentName, status, message, payload = {} }) => {
  const eventPayload = {
    step, // 'DETECTION' | 'DIAGNOSIS' | 'POLICY_CHECK' | 'EXECUTION' | 'RECOVERY' | 'AUDIT'
    timestamp: new Date().toISOString(),
    caseId,
    agentName,
    status,
    message,
    payload,
  };

  if (ioInstance) {
    ioInstance.emit('agent:step', eventPayload);
  }
  return eventPayload;
};

/**
 * Autonomous Recovery Engine Pipeline Execution
 * Asynchronously steps through:
 * 1. DETECTION
 * 2. DIAGNOSIS
 * 3. POLICY_CHECK
 * 4. EXECUTION
 * 5. RECOVERY
 * 6. AUDIT
 */
export const runAutonomousPipeline = async (targetCase, ioInstance) => {
  const caseId = targetCase.caseNumber || targetCase.caseId;

  try {
    // ------------------------------------------------------------------------
    // STEP 1: DETECTION
    // ------------------------------------------------------------------------
    targetCase.status = 'DETECTED';
    emitAgentStep(ioInstance, {
      step: 'DETECTION',
      caseId,
      agentName: 'INGESTION_AGENT',
      status: 'DETECTED',
      message: `Inbound payment decline ingested: [${targetCase.transaction?.errorCode || targetCase.failureCode}] for ₹${(targetCase.transaction?.amount || targetCase.amount)?.toLocaleString()}`,
      payload: {
        errorCode: targetCase.transaction?.errorCode || targetCase.failureCode,
        amount: targetCase.transaction?.amount || targetCase.amount,
        paymentMethod: targetCase.transaction?.paymentMethod || 'UPI',
      },
    });

    await createChainedAuditLog({
      caseId: targetCase._id,
      caseNumber: caseId,
      agentName: 'INGESTION_AGENT',
      actionTaken: 'PAYMENT_FAILURE_INGESTED',
      payload: {
        errorCode: targetCase.transaction?.errorCode || targetCase.failureCode,
        amount: targetCase.transaction?.amount || targetCase.amount,
      },
    });

    await new Promise((r) => setTimeout(r, 600));

    // ------------------------------------------------------------------------
    // STEP 2: DIAGNOSIS (Dual AI Engine: Gemini 2.5 Flash -> Groq Llama 3.3)
    // ------------------------------------------------------------------------
    targetCase.status = 'DIAGNOSING';
    emitAgentStep(ioInstance, {
      step: 'DIAGNOSIS',
      caseId,
      agentName: 'DUAL_AI_DIAGNOSIS_ENGINE',
      status: 'DIAGNOSING',
      message: 'Running root cause forensic inference via Dual-LLM Pipeline (Gemini 2.5 Flash / Groq Llama 3.3)...',
    });

    const aiDiagnosis = await diagnoseFailure(targetCase);
    targetCase.aiDiagnosis = aiDiagnosis;

    emitAgentStep(ioInstance, {
      step: 'DIAGNOSIS',
      caseId,
      agentName: aiDiagnosis.engineUsed || 'DUAL_AI_DIAGNOSIS_ENGINE',
      status: 'DIAGNOSED',
      message: `AI root cause established: [${aiDiagnosis.recommendedAction}] with ${(aiDiagnosis.confidenceScore * 100).toFixed(0)}% confidence`,
      payload: aiDiagnosis,
    });

    await createChainedAuditLog({
      caseId: targetCase._id,
      caseNumber: caseId,
      agentName: aiDiagnosis.engineUsed || 'DUAL_AI_DIAGNOSIS_ENGINE',
      actionTaken: 'AI_DIAGNOSIS_COMPLETED',
      payload: aiDiagnosis,
    });

    await new Promise((r) => setTimeout(r, 600));

    // ------------------------------------------------------------------------
    // STEP 3: POLICY_CHECK (Bounded Safety Policy Verification)
    // ------------------------------------------------------------------------
    emitAgentStep(ioInstance, {
      step: 'POLICY_CHECK',
      caseId,
      agentName: 'BOUNDED_SAFETY_POLICY_ENGINE',
      status: 'POLICY_VERIFICATION',
      message: 'Evaluating bounded safety rules (Financial Exposure, Max Retries, LTV Discount Floor)...',
    });

    const policySafety = evaluatePolicySafety(targetCase, aiDiagnosis);

    emitAgentStep(ioInstance, {
      step: 'POLICY_CHECK',
      caseId,
      agentName: 'BOUNDED_SAFETY_POLICY_ENGINE',
      status: policySafety.isPermitted ? 'POLICY_PASSED' : 'POLICY_RESTRICTED',
      message: policySafety.policyNotice,
      payload: policySafety,
    });

    await createChainedAuditLog({
      caseId: targetCase._id,
      caseNumber: caseId,
      agentName: 'BOUNDED_SAFETY_POLICY_ENGINE',
      actionTaken: 'POLICY_SAFETY_EVALUATED',
      payload: policySafety,
    });

    await new Promise((r) => setTimeout(r, 600));

    // ------------------------------------------------------------------------
    // STEP 4: EXECUTION / HUMAN ESCALATION
    // ------------------------------------------------------------------------
    if (policySafety.finalAction === 'HUMAN_ESCALATE') {
      targetCase.status = 'AWAITING_HUMAN';
      emitAgentStep(ioInstance, {
        step: 'EXECUTION',
        caseId,
        agentName: 'ESCALATION_DISPATCHER',
        status: 'AWAITING_HUMAN',
        message: 'High-value threshold quarantine active. Operator review required via /approve endpoint.',
        payload: { action: 'HUMAN_ESCALATE' },
      });
    } else {
      targetCase.status = 'SCHEDULED';
      emitAgentStep(ioInstance, {
        step: 'EXECUTION',
        caseId,
        agentName: 'GATEWAY_ORCHESTRATOR',
        status: 'SCHEDULED',
        message: `Executing autonomous remediation: [${policySafety.finalAction}]`,
        payload: { action: policySafety.finalAction },
      });

      // If smart retry or UPI switch, invoke Mock Gateway directly
      if (policySafety.finalAction === 'SMART_RETRY' || policySafety.finalAction === 'UPI_SWITCH') {
        const retryResult = await executeRetry(caseId, {
          action: policySafety.finalAction,
          viaAlternateRail: policySafety.finalAction === 'UPI_SWITCH',
        });

        if (retryResult.success) {
          // ------------------------------------------------------------------
          // STEP 5: RECOVERY
          // ------------------------------------------------------------------
          targetCase.status = 'RECOVERED';
          targetCase.recoveredAt = new Date();
          targetCase.recoveredAmount = targetCase.transaction?.amount || targetCase.amount;

          emitAgentStep(ioInstance, {
            step: 'RECOVERY',
            caseId,
            agentName: 'SETTLEMENT_SWITCH',
            status: 'RECOVERED',
            message: `Settlement confirmed! ₹${(targetCase.transaction?.amount || targetCase.amount)?.toLocaleString()} recovered.`,
            payload: retryResult,
          });

          await createChainedAuditLog({
            caseId: targetCase._id,
            caseNumber: caseId,
            agentName: 'SETTLEMENT_SWITCH',
            actionTaken: 'PAYMENT_RECOVERED',
            payload: retryResult,
          });
        } else {
          targetCase.status = 'FAILED';
          emitAgentStep(ioInstance, {
            step: 'EXECUTION',
            caseId,
            agentName: 'SETTLEMENT_SWITCH',
            status: 'FAILED',
            message: `Retry declined by bank switch: ${retryResult.networkResponse}`,
            payload: retryResult,
          });

          await createChainedAuditLog({
            caseId: targetCase._id,
            caseNumber: caseId,
            agentName: 'SETTLEMENT_SWITCH',
            actionTaken: 'RETRY_DECLINED',
            payload: retryResult,
          });
        }
      } else if (
        policySafety.finalAction === 'WHATSAPP_LINK' ||
        policySafety.finalAction === 'DISCOUNT_OFFER' ||
        targetCase.aiDiagnosis?.recommendedAction === 'WHATSAPP_LINK'
      ) {
        // Execute Real Two-Way WhatsApp Recovery Dispatch
        const customerPhone = targetCase.customer?.phone || DEMO_PHONE_NUMBERS.CUSTOMER_1;
        const customerName = targetCase.customer?.name || 'Customer';
        const amount = targetCase.transaction?.amount || targetCase.amount || 4999;
        const failureReason =
          targetCase.transaction?.errorDescription ||
          targetCase.failureReason ||
          'Issuing bank clearing timeout';

        targetCase.status = 'AWAITING_CUSTOMER';

        const waResult = await sendRecoveryWhatsApp({
          phone: customerPhone,
          customerName,
          amount,
          failureReason,
          caseId,
        });

        emitAgentStep(ioInstance, {
          step: 'EXECUTION',
          caseId,
          agentName: 'WHATSAPP_AUTONOMOUS_DESK',
          status: 'DISPATCHED',
          message: `Two-way recovery alert sent to customer WhatsApp (${customerPhone}). Awaiting customer reply ("PAY" or "DISCOUNT").`,
          payload: waResult,
        });
      }
    }

    // ------------------------------------------------------------------------
    // STEP 6: AUDIT (Cryptographic Integrity Verification)
    // ------------------------------------------------------------------------
    const isChainValid = await verifyChainIntegrity(caseId);

    emitAgentStep(ioInstance, {
      step: 'AUDIT',
      caseId,
      agentName: 'CRYPTOGRAPHIC_AUDIT_LEDGER',
      status: 'SEALED',
      message: `Audit chain cryptographically sealed (SHA-256 chain integrity: ${isChainValid ? 'VERIFIED' : 'FAILED'})`,
      payload: { chainValid: isChainValid },
    });

    if (isDbConnected && targetCase.save) {
      await targetCase.save();
    }

    if (ioInstance) {
      ioInstance.emit('case:updated', targetCase);
    }
  } catch (err) {
    console.error(`[Autonomous Pipeline Error] Case ${caseId}:`, err);
  }
};

// ============================================================================
// API ROUTES
// ============================================================================

// 1. POST /api/simulation/inject
// Accepts scenario type ("NPCI_DOWNTIME" | "INSUFFICIENT_FUNDS" | "HIGH_VALUE_INVOICE"),
// creates a new RecoveryCase, and immediately triggers autonomous pipeline asynchronously.
app.post('/api/simulation/inject', async (req, res) => {
  try {
    const scenarioType = req.body.scenarioType || req.body.scenario || SCENARIO_TYPES.NPCI_DOWNTIME;
    const rawCaseData = createScenarioData(scenarioType);

    // Support explicit test customer profile overrides
    if (req.body.phone) rawCaseData.customer.phone = req.body.phone;
    if (req.body.customerName) rawCaseData.customer.name = req.body.customerName;
    if (req.body.amount) rawCaseData.transaction.amount = Number(req.body.amount);

    let savedCase = null;
    if (isDbConnected) {
      savedCase = await RecoveryCase.create(rawCaseData);
    } else {
      savedCase = rawCaseData;
      inMemoryCases.unshift(savedCase);
    }

    // Broadcast new case to connected clients
    if (io) {
      io.emit('case:new', savedCase);
    }

    // Asynchronously trigger autonomous pipeline (non-blocking)
    setImmediate(() => {
      runAutonomousPipeline(savedCase, io);
    });

    res.status(201).json({
      success: true,
      message: `Scenario '${scenarioType}' injected for ${rawCaseData.customer.name} (${rawCaseData.customer.phone}); autonomous recovery pipeline initiated.`,
      data: savedCase,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Backward compatible injection endpoint
app.post('/api/simulation/inject-failure', async (req, res) => {
  try {
    const rawCaseData = createScenarioData(SCENARIO_TYPES.NPCI_DOWNTIME);
    inMemoryCases.unshift(rawCaseData);
    if (isDbConnected) await RecoveryCase.create(rawCaseData);

    if (io) io.emit('case:new', rawCaseData);
    setImmediate(() => runAutonomousPipeline(rawCaseData, io));

    res.json({ success: true, data: rawCaseData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/cases/:id/retry
// Triggers manual or automated retry on Mock Gateway
app.post('/api/cases/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    let target = inMemoryCases.find((c) => c.caseId === id || c.caseNumber === id);

    if (isDbConnected) {
      const dbCase = await RecoveryCase.findOne({ $or: [{ caseId: id }, { caseNumber: id }] });
      if (dbCase) target = dbCase;
    }

    if (!target) {
      return res.status(404).json({ success: false, message: `Case ${id} not found.` });
    }

    const caseNumber = target.caseNumber || target.caseId;

    emitAgentStep(io, {
      step: 'EXECUTION',
      caseId: caseNumber,
      agentName: 'GATEWAY_ORCHESTRATOR',
      status: 'RETRYING',
      message: 'Manual operator retry triggered. Calling Mock Gateway (1.2s delay)...',
    });

    const retryResult = await executeRetry(caseNumber, {
      action: req.body.action || 'SMART_RETRY',
      viaAlternateRail: req.body.viaAlternateRail || true,
      viaWhatsApp: req.body.viaWhatsApp,
      discountApplied: req.body.discountApplied || 0,
    });

    if (retryResult.success) {
      target.status = 'RECOVERED';
      target.recoveredAt = new Date();
      target.recoveredAmount = target.transaction?.amount || target.amount;

      emitAgentStep(io, {
        step: 'RECOVERY',
        caseId: caseNumber,
        agentName: 'SETTLEMENT_SWITCH',
        status: 'RECOVERED',
        message: `Retry successful! Payment authorized on Mock Gateway.`,
        payload: retryResult,
      });

      await createChainedAuditLog({
        caseId: target._id,
        caseNumber,
        agentName: 'OPERATOR_DISPATCH',
        actionTaken: 'PAYMENT_RECOVERED',
        payload: retryResult,
      });
    } else {
      target.status = 'FAILED';

      emitAgentStep(io, {
        step: 'EXECUTION',
        caseId: caseNumber,
        agentName: 'SETTLEMENT_SWITCH',
        status: 'FAILED',
        message: `Retry declined: ${retryResult.networkResponse}`,
        payload: retryResult,
      });

      await createChainedAuditLog({
        caseId: target._id,
        caseNumber,
        agentName: 'OPERATOR_DISPATCH',
        actionTaken: 'RETRY_DECLINED',
        payload: retryResult,
      });
    }

    const isChainValid = await verifyChainIntegrity(caseNumber);
    emitAgentStep(io, {
      step: 'AUDIT',
      caseId: caseNumber,
      agentName: 'CRYPTOGRAPHIC_AUDIT_LEDGER',
      status: 'SEALED',
      message: `Audit chain sealed. Integrity: ${isChainValid ? 'VERIFIED' : 'TAMPERED'}`,
      payload: { chainValid: isChainValid },
    });

    if (isDbConnected && target.save) await target.save();
    if (io) io.emit('case:updated', target);

    res.json({ success: true, result: retryResult, data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/cases/:id/approve
// Human-in-the-loop approval endpoint
app.post('/api/cases/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    let target = inMemoryCases.find((c) => c.caseId === id || c.caseNumber === id);

    if (isDbConnected) {
      const dbCase = await RecoveryCase.findOne({ $or: [{ caseId: id }, { caseNumber: id }] });
      if (dbCase) target = dbCase;
    }

    if (!target) {
      return res.status(404).json({ success: false, message: `Case ${id} not found.` });
    }

    const caseNumber = target.caseNumber || target.caseId;

    emitAgentStep(io, {
      step: 'EXECUTION',
      caseId: caseNumber,
      agentName: 'HUMAN_OPERATOR_INTERFACE',
      status: 'APPROVED',
      message: `Operator approval confirmed by ${req.body.operatorName || 'Principal Finance Lead'}. Authorizing wire clearance...`,
    });

    // Execute wire approval through Mock Gateway
    const approvalResult = await executeRetry(caseNumber, { isApprovedByHuman: true });

    target.status = 'RECOVERED';
    target.recoveredAt = new Date();
    target.recoveredAmount = target.transaction?.amount || target.amount;

    emitAgentStep(io, {
      step: 'RECOVERY',
      caseId: caseNumber,
      agentName: 'SETTLEMENT_SWITCH',
      status: 'RECOVERED',
      message: `High-value payment approved & cleared. ₹${(target.transaction?.amount || target.amount)?.toLocaleString()} recovered.`,
      payload: approvalResult,
    });

    await createChainedAuditLog({
      caseId: target._id,
      caseNumber,
      agentName: req.body.operatorName || 'HUMAN_OPERATOR',
      actionTaken: 'HUMAN_APPROVAL_GRANTED',
      payload: {
        approvalNotes: req.body.notes || 'Approved following executive sign-off',
        result: approvalResult,
      },
    });

    const isChainValid = await verifyChainIntegrity(caseNumber);
    emitAgentStep(io, {
      step: 'AUDIT',
      caseId: caseNumber,
      agentName: 'CRYPTOGRAPHIC_AUDIT_LEDGER',
      status: 'SEALED',
      message: `Audit chain sealed. Integrity: ${isChainValid ? 'VERIFIED' : 'TAMPERED'}`,
      payload: { chainValid: isChainValid },
    });

    if (isDbConnected && target.save) await target.save();
    if (io) io.emit('case:updated', target);

    res.json({
      success: true,
      message: 'Human-in-the-loop approval executed successfully.',
      data: target,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3b. POST /api/cases/:id/reject
// Human-in-the-loop rejection endpoint
app.post('/api/cases/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    let target = inMemoryCases.find((c) => c.caseId === id || c.caseNumber === id);

    if (isDbConnected) {
      const dbCase = await RecoveryCase.findOne({ $or: [{ caseId: id }, { caseNumber: id }] });
      if (dbCase) target = dbCase;
    }

    if (!target) {
      return res.status(404).json({ success: false, message: `Case ${id} not found.` });
    }

    const caseNumber = target.caseNumber || target.caseId;

    emitAgentStep(io, {
      step: 'EXECUTION',
      caseId: caseNumber,
      agentName: 'HUMAN_OPERATOR_INTERFACE',
      status: 'REJECTED',
      message: `Operator manual review rejected by ${req.body.operatorName || 'Principal Finance Lead'}. Settlement halted.`,
    });

    target.status = 'FAILED';

    await createChainedAuditLog({
      caseId: target._id,
      caseNumber,
      agentName: req.body.operatorName || 'HUMAN_OPERATOR',
      actionTaken: 'HUMAN_APPROVAL_REJECTED',
      payload: {
        reason: req.body.reason || 'Manually rejected by human operator due to policy risk',
      },
    });

    const isChainValid = await verifyChainIntegrity(caseNumber);
    emitAgentStep(io, {
      step: 'AUDIT',
      caseId: caseNumber,
      agentName: 'CRYPTOGRAPHIC_AUDIT_LEDGER',
      status: 'SEALED',
      message: `Audit chain sealed. Integrity: ${isChainValid ? 'VERIFIED' : 'TAMPERED'}`,
      payload: { chainValid: isChainValid },
    });

    if (isDbConnected && target.save) await target.save();
    if (io) io.emit('case:updated', target);

    res.json({
      success: true,
      message: 'Case manually rejected and halted.',
      data: target,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. GET /api/cases
// Fetch all active & recovered cases
app.get('/api/cases', getCases);

// 5. GET /api/cases/:id/audit
// Fetch cryptographic audit chain for a specific case
app.get('/api/cases/:id/audit', async (req, res) => {
  try {
    const { id } = req.params;
    let logs = [];

    if (isDbConnected) {
      logs = await AuditLog.find({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(id) && id.length === 24 ? [{ caseId: id }] : []),
          { caseNumber: id },
        ],
      }).sort({ timestamp: 1, createdAt: 1 });
    }

    if (!logs || logs.length === 0) {
      logs = AuditService.getRecentLogs(100).filter(
        (l) => l.caseNumber === id || String(l.caseId) === id
      ).reverse();
    }

    const isChainValid = await verifyChainIntegrity(id);

    res.json({
      success: true,
      caseId: id,
      chainValid: isChainValid,
      count: logs.length,
      auditTrail: logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Additional telemetry endpoints
app.get('/api/cases/metrics/overview', getMetrics);
app.get('/api/cases/:id', getCaseById);
app.post('/api/cases/:id/diagnose', triggerAiDiagnosis);
app.get('/api/audit/logs', (req, res) => {
  res.json({ success: true, data: AuditService.getRecentLogs() });
});
app.get('/api/audit/verify/:caseId', async (req, res) => {
  try {
    const isValid = await verifyChainIntegrity(req.params.caseId);
    res.json({ success: true, caseId: req.params.caseId, chainValid: isValid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Omnichannel and copilot endpoints
app.post('/api/simulation/whatsapp', simulateWhatsAppAction);
app.post('/api/simulation/voice', simulateVoiceAgentTurn);
app.post('/api/copilot/ask', askCopilot);
app.post('/api/copilot/chat', streamCopilotChat);

// Automated Pitch Demo Simulation Endpoints
app.post('/api/demo/start', async (req, res) => {
  try {
    const status = await startPitchDemo(io);
    res.json({ success: true, message: 'Pitch demo started', status });
  } catch (err) {
    console.error('Error starting demo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/demo/stop', (req, res) => {
  try {
    const status = stopPitchDemo();
    res.json({ success: true, message: 'Pitch demo stopped', status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/demo/status', (req, res) => {
  res.json({ success: true, status: getDemoStatus() });
});

app.post('/api/demo/approve-voice', async (req, res) => {
  try {
    const result = await approveVoiceCallDemo();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/demo/reset', async (req, res) => {
  try {
    const baseline = await resetDatabaseToBaseline(io);
    res.json({ success: true, message: 'Database reset to baseline', baseline });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WhatsApp Live Two-Way Gateway & Telemetry Routes
app.use('/api/whatsapp', whatsappRoutes);

// Interactive Browser QR Scanner Page
app.get('/qr', async (req, res) => {
  const status = getWhatsAppStatus();
  if (status.isReady) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp Recovery Desk | Connected</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: white; margin: 0; padding: 1rem; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; text-align: center; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .badge { background: #059669; color: white; padding: 0.5rem 1.25rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; display: inline-block; margin-bottom: 1.25rem; letter-spacing: 0.05em; }
          h2 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">ONLINE & CONNECTED</div>
          <h2>WhatsApp Recovery Desk</h2>
          <p>Autonomous Desk Bot is fully authenticated and active. Inbound payment replies and outbound recovery alerts are operating live.</p>
        </div>
      </body>
      </html>
    `);
  }

  if (!status.qrCode) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp Recovery Desk | Generating QR</title>
        <meta http-equiv="refresh" content="3">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: white; margin: 0; padding: 1rem; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; text-align: center; max-width: 440px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin: 0 0 0.5rem 0;">Initializing WhatsApp Desk...</h2>
          <p style="color: #94a3b8; line-height: 1.5;">Generating terminal QR code. This page refreshes automatically in 3 seconds...</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const svg = await QRCode.toString(status.qrCode, { type: 'svg', width: 320, margin: 2 });
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Scan WhatsApp Recovery Desk QR</title>
        <meta http-equiv="refresh" content="15">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: white; margin: 0; padding: 1.5rem; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; text-align: center; max-width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .qr-box { background: white; padding: 1rem; border-radius: 1.25rem; display: inline-block; margin: 1.5rem 0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4); }
          .qr-box svg { display: block; width: 100%; max-width: 300px; height: auto; }
          .instructions { color: #94a3b8; font-size: 0.85rem; line-height: 1.6; text-align: left; background: #0f172a; padding: 1.25rem; border-radius: 1rem; border: 1px solid #334155; }
          .instructions ol { margin: 0.5rem 0 0 0; padding-left: 1.25rem; }
          .instructions li { margin-bottom: 0.35rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin: 0 0 0.35rem 0; font-size: 1.5rem;">Link WhatsApp Desk</h2>
          <p style="color: #64748b; font-size: 0.85rem; margin: 0;">AI Autonomous Recovery Engine • Auto-refreshes every 15s</p>
          <div class="qr-box">
            ${svg}
          </div>
          <div class="instructions">
            <strong style="color: white;">Scan with WhatsApp on your phone:</strong>
            <ol>
              <li>Open <strong>WhatsApp</strong> on your phone</li>
              <li>Tap <strong>Settings / ⋮</strong> &gt; <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a device</strong> and scan the code above</li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error rendering QR code: ' + err.message);
  }
});

// System Health & Telemetry Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'AI Revenue Recovery Command Center',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    aiEngine: {
      groqConfigured: !!process.env.GROQ_API_KEY,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    },
  });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: \x1b[36m${socket.id}\x1b[0m`);

  socket.emit('terminal:log', {
    id: `SYS-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    type: 'system',
    action: 'TELEMETRY_CONNECTED',
    actor: 'GATEWAY_ORCHESTRATOR',
    checksum: '8f92a10d93fe',
    message: 'Encrypted telemetry link established with Institutional Command Center',
    details: { clientId: socket.id },
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start Server & Connect Database
const startServer = async () => {
  await connectDB();
  initScheduler(io, inMemoryCases);
  initWhatsAppClient();

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`\x1b[1m\x1b[32m  AI REVENUE RECOVERY COMMAND CENTER\x1b[0m`);
    console.log(`  Backend Engine listening on \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
    console.log(`  Autonomous Pipeline: \x1b[33mActive\x1b[0m`);
    console.log(`======================================================\n`);
  });
};

// Start automatically if run directly
if (process.argv[1]?.endsWith('server.js')) {
  startServer();
}

export { app, server, io };
