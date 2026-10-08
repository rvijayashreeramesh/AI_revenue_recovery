import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { app, server } from './server.js';
import {
  executeRetry,
  createScenarioData,
  SCENARIO_TYPES,
} from './services/mockGateway.js';

async function runScenarioIntegrationTests() {
  console.log('--- STARTING MOCK GATEWAY & SERVER PIPELINE INTEGRATION TESTS ---\n');

  // 1. Test MockGateway executeRetry directly
  console.log('1. Testing Mock Gateway Scenarios directly...');

  // 1a: NPCI_DOWNTIME - Attempt 1 fails, attempt 2 with alternate rail succeeds
  console.log('   1a. Scenario: NPCI_DOWNTIME (Attempt 1 vs Alternate Rail)');
  const start1 = Date.now();
  const npciAttempt1 = await executeRetry('RCV-NPCI-01', {
    action: 'SMART_RETRY',
    attemptNumber: 1,
    viaAlternateRail: false,
  });
  const elapsed1 = Date.now() - start1;
  console.log(`       Attempt 1 completed in ${elapsed1}ms. Success:`, npciAttempt1.success);
  if (elapsed1 < 1100) {
    throw new Error(`Expected at least 1200ms processing delay, but got ${elapsed1}ms`);
  }

  const start2 = Date.now();
  const npciAttempt2 = await executeRetry('RCV-NPCI-01', {
    action: 'UPI_SWITCH',
    viaAlternateRail: true,
  });
  const elapsed2 = Date.now() - start2;
  console.log(`       Alternate rail completed in ${elapsed2}ms. Success:`, npciAttempt2.success);
  if (!npciAttempt2.success) {
    throw new Error('Expected alternate UPI rail retry to succeed!');
  }
  console.log('       ✓ NPCI_DOWNTIME scenario verified!');

  // 1b: INSUFFICIENT_FUNDS - Auto retry fails, WhatsApp link succeeds
  console.log('\n   1b. Scenario: INSUFFICIENT_FUNDS (Auto Retry vs WhatsApp Link)');
  const insufAuto = await executeRetry('RCV-INSUF-02', { action: 'SMART_RETRY' });
  console.log('       Auto retry success:', insufAuto.success, 'Error:', insufAuto.errorCode);
  if (insufAuto.success !== false) {
    throw new Error('Expected automatic retry on INSUFFICIENT_FUNDS to fail!');
  }

  const insufWhatsApp = await executeRetry('RCV-INSUF-02', {
    action: 'WHATSAPP_LINK',
    viaWhatsApp: true,
    discountApplied: 5,
  });
  console.log('       WhatsApp portal success:', insufWhatsApp.success, 'Amount:', insufWhatsApp.amount);
  if (!insufWhatsApp.success) {
    throw new Error('Expected WhatsApp discount link to succeed!');
  }
  console.log('       ✓ INSUFFICIENT_FUNDS scenario verified!');

  // 1c: HIGH_VALUE_INVOICE - ₹1,50,000 routes to human approval
  console.log('\n   1c. Scenario: HIGH_VALUE_INVOICE (₹1,50,000)');
  const highValDirect = await executeRetry('RCV-HIGHVAL-03', { isApprovedByHuman: false });
  console.log('       Autonomous attempt success:', highValDirect.success, 'Code:', highValDirect.errorCode);
  if (highValDirect.success !== false) {
    throw new Error('High value invoice must decline without human approval!');
  }

  const highValApproved = await executeRetry('RCV-HIGHVAL-03', { isApprovedByHuman: true });
  console.log('       Human approved attempt success:', highValApproved.success);
  if (!highValApproved.success) {
    throw new Error('High value invoice must succeed when human approved!');
  }
  console.log('       ✓ HIGH_VALUE_INVOICE scenario verified!');

  // 2. Test Server API & WebSocket 'agent:step' broadcast
  console.log('\n2. Testing Server API Endpoints & Real-time Socket.IO Agent Steps...');

  const TEST_PORT = 5099;
  await new Promise((res) => server.listen(TEST_PORT, res));
  console.log(`   ✓ Server listening on http://localhost:${TEST_PORT}`);

  // Connect Socket.IO client
  const socketClient = ClientIO(`http://localhost:${TEST_PORT}`, {
    transports: ['websocket'],
  });

  const capturedSteps = [];
  socketClient.on('agent:step', (data) => {
    capturedSteps.push(data);
    console.log(`     [WS agent:step] Step: ${data.step} | Status: ${data.status} | Agent: ${data.agentName}`);
  });

  await new Promise((res) => socketClient.on('connect', res));
  console.log('   ✓ Test WebSocket client connected!');

  // Test POST /api/simulation/inject
  console.log('\n   2a. Calling POST /api/simulation/inject (NPCI_DOWNTIME)...');
  const injectRes = await fetch(`http://localhost:${TEST_PORT}/api/simulation/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: SCENARIO_TYPES.NPCI_DOWNTIME }),
  });
  const injectData = await injectRes.json();
  console.log('       Inject response:', injectData.success, 'Case:', injectData.data?.caseNumber);
  if (!injectData.success) {
    throw new Error('POST /api/simulation/inject failed');
  }

  const testCaseId = injectData.data.caseNumber;

  // Allow asynchronous autonomous pipeline steps to execute and broadcast
  console.log('       Waiting for pipeline steps to complete (DETECTION, DIAGNOSIS, POLICY_CHECK, EXECUTION, RECOVERY, AUDIT)...');
  const maxWait = 15000;
  const startWait = Date.now();
  while (Date.now() - startWait < maxWait) {
    const names = capturedSteps.map((s) => s.step);
    if (names.includes('AUDIT')) break;
    await new Promise((res) => setTimeout(res, 250));
  }

  console.log(`       Total agent:step events captured: ${capturedSteps.length}`);
  const stepNames = capturedSteps.map((s) => s.step);
  console.log('       Sequence observed:', stepNames.join(' -> '));

  if (!stepNames.includes('DETECTION') || !stepNames.includes('DIAGNOSIS') || !stepNames.includes('POLICY_CHECK') || !stepNames.includes('AUDIT')) {
    throw new Error(`Pipeline did not emit required agent:step sequence. Found: ${stepNames}`);
  }
  console.log('       ✓ Agent step sequence verified!');

  // Test GET /api/cases
  console.log('\n   2b. Calling GET /api/cases...');
  const getCasesRes = await fetch(`http://localhost:${TEST_PORT}/api/cases`);
  const casesData = await getCasesRes.json();
  console.log('       Total cases returned:', casesData.count);
  if (!casesData.success || casesData.count === 0) {
    throw new Error('GET /api/cases failed');
  }
  console.log('       ✓ GET /api/cases passed!');

  // Test GET /api/cases/:id/audit
  console.log(`\n   2c. Calling GET /api/cases/${testCaseId}/audit...`);
  const auditRes = await fetch(`http://localhost:${TEST_PORT}/api/cases/${testCaseId}/audit`);
  const auditData = await auditRes.json();
  console.log('       Audit entries:', auditData.count, 'Chain Valid:', auditData.chainValid);
  if (!auditData.success || auditData.count === 0 || !auditData.chainValid) {
    throw new Error('GET /api/cases/:id/audit failed or chain invalid');
  }
  console.log('       ✓ GET /api/cases/:id/audit passed & verified unbroken!');

  // Test POST /api/cases/:id/retry
  console.log(`\n   2d. Calling POST /api/cases/${testCaseId}/retry...`);
  const retryRes = await fetch(`http://localhost:${TEST_PORT}/api/cases/${testCaseId}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'UPI_SWITCH', viaAlternateRail: true }),
  });
  const retryData = await retryRes.json();
  console.log('       Retry result success:', retryData.success);
  if (!retryData.success) {
    throw new Error('POST /api/cases/:id/retry failed');
  }
  console.log('       ✓ POST /api/cases/:id/retry passed!');

  // Test POST /api/cases/:id/approve for a high-value invoice case
  console.log('\n   2e. Testing High-Value Invoice Injection & Human Approval (/approve)...');
  const highValInject = await fetch(`http://localhost:${TEST_PORT}/api/simulation/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: SCENARIO_TYPES.HIGH_VALUE_INVOICE }),
  });
  const highValData = await highValInject.json();
  const highValCaseId = highValData.data?.caseNumber;

  // Wait for policy check to mark it AWAITING_HUMAN
  const startWait2 = Date.now();
  while (Date.now() - startWait2 < 12000) {
    const chk = await fetch(`http://localhost:${TEST_PORT}/api/cases`);
    const chkData = await chk.json();
    const target = chkData.data?.find((c) => c.caseNumber === highValCaseId);
    if (target && target.status === 'AWAITING_HUMAN') break;
    await new Promise((res) => setTimeout(res, 250));
  }

  // Approve it
  const approveRes = await fetch(`http://localhost:${TEST_PORT}/api/cases/${highValCaseId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operatorName: 'Principal Architect', notes: 'Approved for wire clearing' }),
  });
  const approveData = await approveRes.json();
  console.log('       Approve status:', approveData.success, 'Case status:', approveData.data?.status);
  if (!approveData.success || approveData.data?.status !== 'RECOVERED') {
    throw new Error('POST /api/cases/:id/approve failed or case not marked RECOVERED');
  }
  console.log('       ✓ Human-in-the-loop /approve verified successfully!');

  // Cleanup
  socketClient.disconnect();
  server.close();
  console.log('\n--- ALL MOCK GATEWAY & SERVER INTEGRATION TESTS PASSED! ---\n');
  process.exit(0);
}

runScenarioIntegrationTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
