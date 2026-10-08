import {
  diagnoseFailure,
  evaluatePolicySafety,
  ALLOWED_ACTIONS,
} from './services/aiDiagnosisService.js';

async function runAiSafetyTests() {
  console.log('--- STARTING DUAL-AI ENGINE & BOUNDED SAFETY TESTS ---\n');

  // Test 1: Test diagnoseFailure output schema and valid actions
  console.log('1. Testing diagnoseFailure schema and valid enums...');
  const testCase = {
    caseId: 'RCV-40192',
    customer: {
      id: 'cust_001',
      name: 'Rohan Mehra',
      email: 'rohan.mehra@techcorp.in',
      vpa: 'rohan@okhdfcbank',
      previousSuccessCount: 12,
      ltv: 42000,
    },
    transaction: {
      amount: 14500,
      currency: 'INR',
      paymentMethod: 'UPI',
      errorCode: 'NPCI_BANK_DOWNTIME',
      errorDescription: 'NPCI Switch reported issuer node unresponsiveness',
      gateway: 'RAZORPAY_MOCK',
    },
    retrySchedule: {
      attemptCount: 1,
      maxRetries: 3,
    },
  };

  const diag = await diagnoseFailure(testCase);
  console.log('   ✓ Diagnostic response received:');
  console.log('     Root Cause:          ', diag.rootCause);
  console.log('     Recovery Probability:', diag.recoveryProbability);
  console.log('     Confidence Score:    ', diag.confidenceScore);
  console.log('     Recommended Action:  ', diag.recommendedAction);
  console.log('     Reasoning Steps:     ', diag.reasoning?.length);
  console.log('     Engine Used:         ', diag.engineUsed);

  // Assert schema
  if (typeof diag.rootCause !== 'string' || diag.rootCause.trim() === '') {
    throw new Error('rootCause must be a non-empty string');
  }
  if (typeof diag.recoveryProbability !== 'number' || diag.recoveryProbability < 0 || diag.recoveryProbability > 1) {
    throw new Error('recoveryProbability must be a number between 0 and 1');
  }
  if (typeof diag.confidenceScore !== 'number' || diag.confidenceScore < 0 || diag.confidenceScore > 1) {
    throw new Error('confidenceScore must be a number between 0 and 1');
  }
  if (!ALLOWED_ACTIONS.includes(diag.recommendedAction)) {
    throw new Error(`recommendedAction ${diag.recommendedAction} is not in ALLOWED_ACTIONS`);
  }
  if (!Array.isArray(diag.reasoning) || diag.reasoning.length === 0) {
    throw new Error('reasoning must be a non-empty array of strings');
  }
  console.log('   ✓ Schema validation passed 100%!');

  // Test 2: Bounded Safety - Rule 1: amount > ₹50,000 forces HUMAN_ESCALATE
  console.log('\n2. Testing Bounded Safety Rule 1: Amount > ₹50,000 forces HUMAN_ESCALATE...');
  const highValueCase = {
    transaction: { amount: 85000, currency: 'INR' },
    retrySchedule: { attemptCount: 1 },
    customer: { ltv: 120000 },
  };
  const safetyRule1 = evaluatePolicySafety(highValueCase, { recommendedAction: 'SMART_RETRY' });
  console.log('   Result:', safetyRule1);

  if (safetyRule1.finalAction !== 'HUMAN_ESCALATE' || safetyRule1.isPermitted !== false) {
    throw new Error('Rule 1 Failed: High value transaction (> ₹50,000) was not forced to HUMAN_ESCALATE');
  }
  console.log('   ✓ Rule 1 verified: High-value transaction correctly forced to HUMAN_ESCALATE!');

  // Test 3: Bounded Safety - Rule 2: attemptCount >= 3 rejects automated retry
  console.log('\n3. Testing Bounded Safety Rule 2: attemptCount >= 3 rejects SMART_RETRY...');
  const maxAttemptsCase = {
    transaction: { amount: 12000, currency: 'INR' },
    retrySchedule: { attemptCount: 3 },
    customer: { ltv: 30000 },
  };
  const safetyRule2 = evaluatePolicySafety(maxAttemptsCase, { recommendedAction: 'SMART_RETRY' });
  console.log('   Result:', safetyRule2);

  if (safetyRule2.finalAction === 'SMART_RETRY' || safetyRule2.isPermitted !== false) {
    throw new Error('Rule 2 Failed: Attempt count >= 3 permitted automated retry');
  }
  console.log('   ✓ Rule 2 verified: Automated retry blocked after 3 attempts; routed to', safetyRule2.finalAction);

  // Test 4: Bounded Safety - Rule 3: Discount only permitted if LTV > ₹15,000
  console.log('\n4. Testing Bounded Safety Rule 3: Discount offer requires LTV > ₹15,000...');
  const lowLtvCase = {
    transaction: { amount: 4500, currency: 'INR' },
    retrySchedule: { attemptCount: 1 },
    customer: { ltv: 8000 }, // Low LTV <= 15,000
  };
  const safetyRule3Blocked = evaluatePolicySafety(lowLtvCase, { recommendedAction: 'DISCOUNT_OFFER' });
  console.log('   Low LTV Result:', safetyRule3Blocked);

  if (safetyRule3Blocked.finalAction === 'DISCOUNT_OFFER' || safetyRule3Blocked.isPermitted !== false) {
    throw new Error('Rule 3 Failed: Low LTV user was permitted commercial discount');
  }
  console.log('   ✓ Rule 3 (Low LTV) verified: Discount denied for LTV <= ₹15,000!');

  const highLtvCase = {
    transaction: { amount: 4500, currency: 'INR' },
    retrySchedule: { attemptCount: 1 },
    customer: { ltv: 35000 }, // Eligible LTV > 15,000
  };
  const safetyRule3Permitted = evaluatePolicySafety(highLtvCase, { recommendedAction: 'DISCOUNT_OFFER' });
  console.log('   High LTV Result:', safetyRule3Permitted);

  if (safetyRule3Permitted.finalAction !== 'DISCOUNT_OFFER' || safetyRule3Permitted.isPermitted !== true) {
    throw new Error('Rule 3 Failed: Eligible high LTV user was denied commercial discount');
  }
  console.log('   ✓ Rule 3 (High LTV) verified: Discount permitted for LTV > ₹15,000!');

  console.log('\n--- ALL DUAL-AI ENGINE & BOUNDED SAFETY TESTS PASSED! ---\n');
}

runAiSafetyTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
