import mongoose from 'mongoose';
import { RecoveryCase } from './models/RecoveryCase.js';
import { AuditLog } from './models/AuditLog.js';
import { createChainedAuditLog, verifyChainIntegrity, GENESIS_HASH } from './services/auditService.js';

async function runTests() {
  console.log('--- STARTING AUDIT LEDGER & RECOVERY CASE UNIT TESTS ---\n');

  // Test 1: Validate RecoveryCase Schema Fields
  console.log('1. Testing RecoveryCase Model validation...');
  const testCase = new RecoveryCase({
    caseId: 'RCV-88214',
    customer: {
      id: 'cust_ind_991',
      name: 'Aarav Sharma',
      phone: '+91 98765 43210',
      email: 'aarav.sharma@enterprise.in',
      vpa: 'aarav@okhdfcbank',
      previousSuccessCount: 14,
      ltv: 245000,
    },
    transaction: {
      amount: 45000,
      currency: 'INR',
      paymentMethod: 'UPI',
      errorCode: 'U30_DEBIT_TIMEOUT',
      errorDescription: 'NPCI UPI Switch timeout during debit authorization',
      gateway: 'RAZORPAY_MOCK',
    },
    category: 'FAILED_PAYMENT',
    status: 'DETECTED',
    aiDiagnosis: {
      rootCause: 'Issuing bank UPI switch timeout during peak evening traffic.',
      recoveryProbability: 0.88,
      confidenceScore: 0.94,
      recommendedAction: 'UPI_SWITCH',
      reasoning: [
        'HDFC Bank UPI switch latency detected (>3500ms).',
        'Customer has secondary VPA on ICICI Bank.',
        'Recommend instant UPI intent switch trigger via WhatsApp.'
      ],
    },
    retrySchedule: {
      attemptCount: 0,
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() + 600000),
    },
    discountApplied: 5,
  });

  const validationError = testCase.validateSync();
  if (validationError) {
    console.error('Validation failed:', validationError);
    process.exit(1);
  }
  console.log('   ✓ RecoveryCase schema validated successfully!');
  console.log('   ✓ Case ID:', testCase.caseId);
  console.log('   ✓ Customer VPA:', testCase.customer.vpa);
  console.log('   ✓ Currency:', testCase.transaction.currency);
  console.log('   ✓ Gateway:', testCase.transaction.gateway);
  console.log('   ✓ Recommended Action:', testCase.aiDiagnosis.recommendedAction);

  // Test 2: Test Discount constraint (max 10)
  console.log('\n2. Testing DiscountApplied constraint (max 10)...');
  const invalidDiscountCase = new RecoveryCase({
    caseId: 'RCV-99999',
    customer: { id: 'c1', name: 'Test', email: 'test@mail.com' },
    transaction: { amount: 1000 },
    discountApplied: 15, // Invalid, exceeds max 10
  });
  const discountErr = invalidDiscountCase.validateSync();
  if (discountErr && discountErr.errors['discountApplied']) {
    console.log('   ✓ Discount constraint enforced properly: reject > 10%');
  } else {
    console.error('   ✗ Failed to enforce discount max 10%');
    process.exit(1);
  }

  // Test 3: Test Cryptographic Chained Audit Log Creation
  console.log('\n3. Testing Cryptographic Chained Audit Log creation...');
  const testCaseNumber = 'RCV-88214';

  const entry1 = await createChainedAuditLog({
    caseNumber: testCaseNumber,
    agentName: 'INGESTION_AGENT',
    actionTaken: 'PAYMENT_FAILURE_INGESTED',
    payload: { errorCode: 'U30_DEBIT_TIMEOUT', amount: 45000, currency: 'INR' },
  });

  console.log('   ✓ Entry #1 created:');
  console.log('     previousHash:', entry1.previousHash);
  console.log('     hash:        ', entry1.hash);

  if (entry1.previousHash !== GENESIS_HASH) {
    console.error(`   ✗ Genesis hash mismatch! Expected ${GENESIS_HASH}, got ${entry1.previousHash}`);
    process.exit(1);
  }

  const entry2 = await createChainedAuditLog({
    caseNumber: testCaseNumber,
    agentName: 'AI_DIAGNOSIS_AGENT',
    actionTaken: 'DIAGNOSIS_COMPLETED',
    payload: { rootCause: 'UPI Timeout', recoveryProbability: 0.88, recommendedAction: 'UPI_SWITCH' },
  });

  console.log('   ✓ Entry #2 created:');
  console.log('     previousHash:', entry2.previousHash);
  console.log('     hash:        ', entry2.hash);

  if (entry2.previousHash !== entry1.hash) {
    console.error(`   ✗ Chain break! Entry 2 previousHash does not match Entry 1 hash`);
    process.exit(1);
  }

  const entry3 = await createChainedAuditLog({
    caseNumber: testCaseNumber,
    agentName: 'AUTONOMOUS_RECOVERY_ENGINE',
    actionTaken: 'WHATSAPP_UPI_INTENT_SENT',
    payload: { vpaTarget: 'aarav@okicici', discountOffered: 5 },
  });

  console.log('   ✓ Entry #3 created:');
  console.log('     previousHash:', entry3.previousHash);
  console.log('     hash:        ', entry3.hash);

  if (entry3.previousHash !== entry2.hash) {
    console.error(`   ✗ Chain break! Entry 3 previousHash does not match Entry 2 hash`);
    process.exit(1);
  }

  // Test 4: Verify Chain Integrity
  console.log('\n4. Testing verifyChainIntegrity...');
  const isChainValid = await verifyChainIntegrity(testCaseNumber);
  console.log('   Chain integrity verification result:', isChainValid);
  if (!isChainValid) {
    console.error('   ✗ Expected chain to be valid, but verifyChainIntegrity returned false');
    process.exit(1);
  }
  console.log('   ✓ Chain integrity verified: UNBROKEN!');

  // Test 5: Tamper Detection
  console.log('\n5. Testing tamper detection by corrupting entry #2 payload...');
  entry2.payload.rootCause = 'TAMPERED_FRAUDULENT_DATA';
  const isTamperedChainValid = await verifyChainIntegrity(testCaseNumber);
  console.log('   Tampered chain verification result:', isTamperedChainValid);
  if (isTamperedChainValid === false) {
    console.log('   ✓ Tamper detection successfully caught corrupted block!');
  } else {
    console.error('   ✗ Failed to detect tampering in audit log chain');
    process.exit(1);
  }

  console.log('\n--- ALL AUDIT LEDGER TESTS PASSED SUCCESSFULLY! ---\n');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
