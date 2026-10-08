/**
 * High-Fidelity Mock Gateway & Scenario Engine
 * Implements Razorpay / NPCI switch emulation with deterministic scenarios:
 * 1. "NPCI_DOWNTIME": Fails on attempt 1, succeeds when retried via alternate UPI rail.
 * 2. "INSUFFICIENT_FUNDS": Always fails automatic retry, succeeds when triggered via simulated WhatsApp discount link.
 * 3. "HIGH_VALUE_INVOICE": Overdue invoice of ₹1,50,000, routes to human escalation and voice call.
 */

import { inMemoryCases } from '../controllers/caseController.js';
import { RecoveryCase } from '../models/RecoveryCase.js';
import { isDbConnected } from '../config/db.js';
import { DEMO_PHONE_NUMBERS, TEST_CUSTOMER_PROFILES } from '../config/demoNumbers.js';

export const SCENARIO_TYPES = {
  NPCI_DOWNTIME: 'NPCI_DOWNTIME',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  HIGH_VALUE_INVOICE: 'HIGH_VALUE_INVOICE',
};

/**
 * Factory to instantiate high-fidelity scenario cases
 */
export const createScenarioData = (scenarioType = SCENARIO_TYPES.NPCI_DOWNTIME) => {
  const caseNumber = `RCV-${Math.floor(10000 + Math.random() * 90000)}`;

  switch (scenarioType) {
    case SCENARIO_TYPES.NPCI_DOWNTIME:
      return {
        caseId: caseNumber,
        caseNumber,
        customer: {
          id: `cust_npci_${Math.random().toString(36).substring(2, 7)}`,
          name: 'Rahul Sharma',
          phone: DEMO_PHONE_NUMBERS.CUSTOMER_1,
          email: 'rahul.sharma@corp.in',
          company: 'Apex Retail Tech',
          vpa: 'rahul.sharma@okhdfcbank',
          previousSuccessCount: 16,
          ltv: 48500,
        },
        transaction: {
          amount: 4999,
          currency: 'INR',
          paymentMethod: 'UPI',
          errorCode: 'NPCI_BANK_DOWNTIME',
          errorDescription: 'NPCI UPI Switch reported issuer node degraded latency (>4000ms)',
          gateway: 'RAZORPAY_MOCK',
        },
        category: 'FAILED_PAYMENT',
        status: 'DETECTED',
        retrySchedule: {
          attemptCount: 1,
          maxRetries: 3,
        },
        discountApplied: 0,
      };

    case SCENARIO_TYPES.INSUFFICIENT_FUNDS:
      return {
        caseId: caseNumber,
        caseNumber,
        customer: {
          id: `cust_insuf_${Math.random().toString(36).substring(2, 7)}`,
          name: 'Priya Patel',
          phone: DEMO_PHONE_NUMBERS.CUSTOMER_2,
          email: 'priya.patel@horizon.co',
          company: 'SaaS Horizon Labs',
          vpa: 'priyapatel@icici',
          previousSuccessCount: 8,
          ltv: 24000,
        },
        transaction: {
          amount: 7999,
          currency: 'INR',
          paymentMethod: 'UPI',
          errorCode: 'INSUFFICIENT_FUNDS',
          errorDescription: 'Issuing bank declined charge: Available balance below debit request (Code 51)',
          gateway: 'RAZORPAY_MOCK',
        },
        category: 'SUBSCRIPTION_FAILURE',
        status: 'DETECTED',
        retrySchedule: {
          attemptCount: 1,
          maxRetries: 3,
        },
        discountApplied: 0,
      };

    case SCENARIO_TYPES.HIGH_VALUE_INVOICE:
      return {
        caseId: caseNumber,
        caseNumber,
        customer: {
          id: `cust_ent_${Math.random().toString(36).substring(2, 7)}`,
          name: 'Arjun Mehta',
          phone: DEMO_PHONE_NUMBERS.CUSTOMER_3,
          email: 'arjun.mehta@finscale.in',
          vpa: 'arjun.mehta@axisbank',
          previousSuccessCount: 42,
          ltv: 620000,
        },
        transaction: {
          amount: 150000,
          currency: 'INR',
          paymentMethod: 'INVOICE',
          errorCode: 'OVERDUE_INVOICE_60D',
          errorDescription: 'Enterprise Net-30 invoice term matured; auto-debit corporate mandate rejected',
          gateway: 'RAZORPAY_MOCK',
        },
        category: 'OVERDUE_INVOICE',
        status: 'DETECTED',
        retrySchedule: {
          attemptCount: 0,
          maxRetries: 2,
        },
        discountApplied: 0,
      };

    default:
      return createScenarioData(SCENARIO_TYPES.NPCI_DOWNTIME);
  }
};

/**
 * Gateway Execution Engine
 * Simulates exactly 1.2s gateway processing delay, resolves with success or failure payload.
 * 
 * Rules:
 * a) "NPCI_DOWNTIME": Fails on attempt 1, succeeds when retried via alternate UPI rail (e.g. alternateRail: true or attempt > 1).
 * b) "INSUFFICIENT_FUNDS": Always fails automatic retry, succeeds when triggered via simulated WhatsApp discount link (viaWhatsApp: true).
 * c) "HIGH_VALUE_INVOICE": Overdue invoice of ₹1,50,000, routes to human escalation and voice call.
 */
export const executeRetry = async (caseId, options = {}) => {
  // 1. Enforce strict 1.2s gateway processing delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Retrieve case details from in-memory or DB
  let currentCase = inMemoryCases.find((c) => c.caseId === caseId || c.caseNumber === caseId);

  if (isDbConnected && (!currentCase || !currentCase.transaction)) {
    try {
      const dbCase = await RecoveryCase.findOne({
        $or: [{ caseId }, { caseNumber: caseId }],
      });
      if (dbCase) currentCase = dbCase;
    } catch (e) {
      // Continue gracefully
    }
  }

  const amount = currentCase?.transaction?.amount ?? currentCase?.amount ?? (caseId?.includes('HIGHVAL') ? 150000 : 14500);
  const errorCode = (
    options.errorCode ||
    options.scenario ||
    currentCase?.transaction?.errorCode ||
    currentCase?.failureCode ||
    (caseId?.includes('NPCI') ? 'NPCI_BANK_DOWNTIME' : caseId?.includes('INSUF') ? 'INSUFFICIENT_FUNDS' : caseId?.includes('HIGHVAL') ? 'OVERDUE_INVOICE' : '')
  ).toUpperCase();

  const attemptCount = options.attemptNumber ?? options.attemptCount ?? currentCase?.retrySchedule?.attemptCount ?? 1;
  const { viaAlternateRail = false, viaWhatsApp = false, discountApplied = 0 } = options;

  const chargeId = `ch_rzp_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  const timestamp = new Date().toISOString();

  // Scenario a: NPCI_DOWNTIME
  if (errorCode.includes('NPCI') || errorCode.includes('DOWNTIME')) {
    // Fails on attempt 1, succeeds when retried via alternate UPI rail
    const isAlternate = viaAlternateRail || options.action === 'UPI_SWITCH' || attemptCount > 1;

    if (isAlternate) {
      return {
        success: true,
        chargeId,
        status: 'succeeded',
        amount,
        paymentRail: 'UPI_ALTERNATE_SWITCH',
        vpaUsed: currentCase?.customer?.vpa ? currentCase.customer.vpa.replace('@okhdfcbank', '@okaxis') : 'alternate@okaxis',
        networkResponse: '00 - NPCI APPROVAL - SWITCH ROUTED VIA AXIS/ICICI FAILOVER',
        fee: Math.round(amount * 0.003),
        timestamp,
      };
    } else {
      return {
        success: false,
        chargeId,
        status: 'declined',
        amount,
        errorCode: 'NPCI_BANK_DOWNTIME',
        networkResponse: 'U30 - NPCI UPI TIMEOUT - PRIMARY ISSUER SWITCH CONGESTION',
        timestamp,
      };
    }
  }

  // Scenario b: INSUFFICIENT_FUNDS
  if (errorCode.includes('INSUFFICIENT') || errorCode.includes('BALANCE')) {
    // Always fails automatic retry, succeeds when triggered via simulated WhatsApp discount link
    const isWhatsAppRecovered = viaWhatsApp || discountApplied > 0 || options.action === 'WHATSAPP_LINK' || options.action === 'DISCOUNT_OFFER';

    if (isWhatsAppRecovered) {
      const discountedAmount = discountApplied > 0 ? Math.round(amount * (1 - discountApplied / 100)) : amount;
      return {
        success: true,
        chargeId,
        status: 'succeeded',
        amount: discountedAmount,
        discountApplied,
        paymentRail: 'WHATSAPP_1CLICK_INTENT',
        networkResponse: '00 - APPROVAL - AUTHORIZED VIA INTERACTIVE WHATSAPP PORTAL',
        timestamp,
      };
    } else {
      return {
        success: false,
        chargeId,
        status: 'declined',
        amount,
        errorCode: 'INSUFFICIENT_FUNDS',
        networkResponse: '51 - DECLINE - INSUFFICIENT ACCOUNT BALANCE',
        timestamp,
      };
    }
  }

  // Scenario c: HIGH_VALUE_INVOICE
  if (amount >= 50000 || errorCode.includes('INVOICE') || errorCode.includes('OVERDUE')) {
    if (options.isApprovedByHuman) {
      return {
        success: true,
        chargeId,
        status: 'succeeded',
        amount,
        paymentRail: 'RTGS_CORPORATE_CLEARING',
        networkResponse: '00 - APPROVAL - MANUAL OPERATOR WIRE SETTLEMENT MATCH',
        timestamp,
      };
    } else {
      return {
        success: false,
        chargeId,
        status: 'declined',
        amount,
        errorCode: 'EXCEEDS_AUTONOMOUS_LIMIT',
        networkResponse: '91 - ROUTED TO HUMAN OPERATOR ESCALATION & VOICE CALL',
        timestamp,
      };
    }
  }

  // Generic fallback
  return {
    success: true,
    chargeId,
    status: 'succeeded',
    amount,
    networkResponse: '00 - APPROVAL',
    timestamp,
  };
};

export class MockGatewayService {
  static async executeRetry(caseId, options) {
    return executeRetry(caseId, options);
  }

  static async processCharge(params = {}) {
    return executeRetry(params.caseId, params);
  }

  static createScenarioData(scenarioType) {
    return createScenarioData(scenarioType);
  }
}

export default MockGatewayService;
