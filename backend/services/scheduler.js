import { MockGatewayService } from './mockGateway.js';
import { AuditService } from './auditService.js';
import { AiDiagnosisService } from './aiDiagnosisService.js';

let schedulerInterval = null;
let ioInstance = null;
let stateRef = null;

export const initScheduler = (io, memoryCasesStore) => {
  ioInstance = io;
  stateRef = memoryCasesStore;

  // Run a periodic recovery heartbeat every 15 seconds
  if (!schedulerInterval) {
    schedulerInterval = setInterval(async () => {
      try {
        await executeAutonomousHeartbeat();
      } catch (err) {
        console.error('[Scheduler] Heartbeat tick error:', err.message);
      }
    }, 15000);
    console.log('[Scheduler] \x1b[32mAutonomous Recovery Daemon started\x1b[0m (15s heartbeat interval).');
  }
};

async function executeAutonomousHeartbeat() {
  if (!stateRef || !stateRef.length) return;

  // Pick a candidate case for autonomous retry or status refresh
  const pendingCases = stateRef.filter(
    (c) => c.status === 'diagnosing' || c.status === 'retrying' || c.status === 'action_required'
  );

  if (pendingCases.length === 0) return;

  const targetCase = pendingCases[Math.floor(Math.random() * pendingCases.length)];

  if (targetCase.status === 'diagnosing') {
    // Complete AI diagnosis
    const diagnosis = await AiDiagnosisService.diagnoseCase(targetCase);
    targetCase.aiDiagnosis = diagnosis;
    targetCase.status = 'action_required';
    targetCase.timeline.unshift({
      timestamp: new Date(),
      event: `Autonomous AI Diagnosis finalized: [${diagnosis.suggestedChannel}]`,
      type: 'ai_decision',
      actor: diagnosis.modelUsed,
      notes: diagnosis.recommendedAction,
    });

    await AuditService.record({
      caseId: targetCase.caseId,
      action: 'AI_DIAGNOSIS_COMPLETED',
      actor: diagnosis.modelUsed,
      category: 'AI_INFERENCE',
      details: {
        rootCause: diagnosis.rootCause,
        confidence: diagnosis.confidenceScore,
        recommendedAction: diagnosis.recommendedAction,
      },
    });

    if (ioInstance) {
      ioInstance.emit('case:updated', targetCase);
    }
  } else if (targetCase.status === 'retrying') {
    // Process gateway simulation
    targetCase.attempts = (targetCase.attempts || 1) + 1;
    const result = await MockGatewayService.processCharge({
      caseId: targetCase.caseId,
      amount: targetCase.amount,
      customer: targetCase.customer,
      failureCode: targetCase.failureCode,
      attemptNumber: targetCase.attempts,
    });

    if (result.success) {
      targetCase.status = 'recovered';
      targetCase.recoveredAmount = targetCase.amount;
      targetCase.timeline.unshift({
        timestamp: new Date(),
        event: `Charge authorized successfully on ${targetCase.gateway}. Amount: $${targetCase.amount}`,
        type: 'success',
        actor: `${targetCase.gateway} Acquirer Switch`,
      });

      await AuditService.record({
        caseId: targetCase.caseId,
        action: 'GATEWAY_CHARGE_SUCCEEDED',
        actor: `${targetCase.gateway}_SWITCH`,
        category: 'GATEWAY',
        details: {
          chargeId: result.chargeId,
          amount: targetCase.amount,
          fee: result.fee,
        },
      });
    } else {
      if (targetCase.attempts >= targetCase.maxAttempts) {
        targetCase.status = 'escalated';
        targetCase.timeline.unshift({
          timestamp: new Date(),
          event: `Max retry ceiling reached (${targetCase.attempts}/${targetCase.maxAttempts}). Escalated to manual operator review.`,
          type: 'critical',
          actor: 'Policy Engine',
        });
      } else {
        targetCase.status = 'action_required';
      }

      await AuditService.record({
        caseId: targetCase.caseId,
        action: 'GATEWAY_CHARGE_FAILED',
        actor: `${targetCase.gateway}_SWITCH`,
        category: 'GATEWAY',
        details: {
          declineCode: result.declineCode,
          failureMessage: result.failureMessage,
        },
      });
    }

    if (ioInstance) {
      ioInstance.emit('case:updated', targetCase);
    }
  }
}
