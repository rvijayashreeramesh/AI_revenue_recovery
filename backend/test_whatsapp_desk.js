/**
 * Autonomous Two-Way WhatsApp Recovery Desk Integration Test Suite
 * Strictly verifies authorization allowlist:
 * Demo 1: 9150840158
 * Demo 2: 8015992021
 * Demo 3: 7358719632
 */
import {
  sanitizeWhatsAppPhone,
  extractDigitsFromJid,
  sendRecoveryWhatsApp,
} from './services/whatsappClient.js';
import {
  DEMO_PHONE_NUMBERS,
  ALLOWED_10_DIGIT_NUMBERS,
  isAuthorizedCustomerPhone,
  TEST_CUSTOMER_PROFILES,
} from './config/demoNumbers.js';
import { createScenarioData, SCENARIO_TYPES } from './services/mockGateway.js';

console.log('\n============================================================');
console.log('🧪 TESTING TWO-WAY WHATSAPP RECOVERY DESK & WHITELIST GUARD');
console.log('============================================================\n');

let testsPassed = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Phone number sanitization
console.log('--- 1. Testing Phone Sanitization ---');
assert(
  sanitizeWhatsAppPhone('+91 91508 40158') === '919150840158@c.us',
  'Sanitizes +91 formatted numbers with spaces'
);
assert(
  sanitizeWhatsAppPhone('9150840158') === '919150840158@c.us',
  'Automatically adds 91 prefix to 10-digit Indian numbers'
);
assert(
  sanitizeWhatsAppPhone('91-80159-92021') === '918015992021@c.us',
  'Strips dashes from number'
);
assert(
  extractDigitsFromJid('917358719632@c.us') === '917358719632',
  'Extracts clean digits from JID'
);

// 2. Strict Whitelist Verification
console.log('\n--- 2. Testing Strict Phone Authorization Whitelist ---');
assert(
  ALLOWED_10_DIGIT_NUMBERS.length === 3 &&
  ALLOWED_10_DIGIT_NUMBERS.includes('9150840158') &&
  ALLOWED_10_DIGIT_NUMBERS.includes('8015992021') &&
  ALLOWED_10_DIGIT_NUMBERS.includes('7358719632'),
  'Whitelist strictly contains only the 3 designated customer numbers'
);

assert(isAuthorizedCustomerPhone('9150840158') === true, 'Allows Demo Number 1: 9150840158 (plain)');
assert(isAuthorizedCustomerPhone('+91 91508 40158') === true, 'Allows Demo Number 1 with +91 format');
assert(isAuthorizedCustomerPhone('919150840158') === true, 'Allows Demo Number 1 with country prefix');

assert(isAuthorizedCustomerPhone('8015992021') === true, 'Allows Demo Number 2: 8015992021 (plain)');
assert(isAuthorizedCustomerPhone('+91 80159 92021') === true, 'Allows Demo Number 2 with +91 format');

assert(isAuthorizedCustomerPhone('7358719632') === true, 'Allows Demo Number 3: 7358719632 (plain)');
assert(isAuthorizedCustomerPhone('+91 73587 19632') === true, 'Allows Demo Number 3 with +91 format');

// Strictly reject non-allowlisted numbers
assert(isAuthorizedCustomerPhone('9876543210') === false, 'Strictly BLOCKS unallowed number: 9876543210');
assert(isAuthorizedCustomerPhone('9999999999') === false, 'Strictly BLOCKS unallowed number: 9999999999');
assert(isAuthorizedCustomerPhone('+1 415 555 2671') === false, 'Strictly BLOCKS international unallowed number');

// 3. Outbound Security Dispatch Blocker Test
console.log('\n--- 3. Testing Outbound Dispatch Security Blocker ---');
async function runAsyncTests() {
  const blockedResult = await sendRecoveryWhatsApp({
    phone: '9999999999',
    customerName: 'Intruder Test',
    amount: 1000,
    caseId: 'BLOCK-001',
  });

  assert(
    blockedResult.success === false && blockedResult.deliveryStatus === 'BLOCKED_UNAUTHORIZED_NUMBER',
    'Outbound dispatcher strictly blocks sending to unauthorized number (9999999999)'
  );

  const allowedResult1 = await sendRecoveryWhatsApp({
    phone: '9150840158',
    customerName: 'Rahul Sharma',
    amount: 4999,
    caseId: 'TEST-001',
  });

  assert(
    allowedResult1.deliveryStatus !== 'BLOCKED_UNAUTHORIZED_NUMBER',
    'Outbound dispatcher allows authorized Demo Number 1 (9150840158)'
  );

  // 4. Scenario Mapping
  console.log('\n--- 4. Testing Scenario Mappings ---');
  const npciCase = createScenarioData(SCENARIO_TYPES.NPCI_DOWNTIME);
  assert(
    npciCase.customer.phone === DEMO_PHONE_NUMBERS.CUSTOMER_1,
    `NPCI_DOWNTIME mapped to Demo Number 1 (${DEMO_PHONE_NUMBERS.CUSTOMER_1})`
  );

  const insufCase = createScenarioData(SCENARIO_TYPES.INSUFFICIENT_FUNDS);
  assert(
    insufCase.customer.phone === DEMO_PHONE_NUMBERS.CUSTOMER_2,
    `INSUFFICIENT_FUNDS mapped to Demo Number 2 (${DEMO_PHONE_NUMBERS.CUSTOMER_2})`
  );

  const invCase = createScenarioData(SCENARIO_TYPES.HIGH_VALUE_INVOICE);
  assert(
    invCase.customer.phone === DEMO_PHONE_NUMBERS.CUSTOMER_3,
    `HIGH_VALUE_INVOICE mapped to Demo Number 3 (${DEMO_PHONE_NUMBERS.CUSTOMER_3})`
  );

  console.log(`\nResults: ${testsPassed}/${totalTests} tests passed.\n`);
  if (testsPassed === totalTests) {
    console.log('🎉 ALL WHATSAPP SECURITY & WHITELIST TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed.');
    process.exit(1);
  }
}

runAsyncTests();
