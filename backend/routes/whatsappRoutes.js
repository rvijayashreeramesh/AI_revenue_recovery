import express from 'express';
import {
  getWhatsAppStatus,
  disconnectSession,
  sendRecoveryWhatsApp,
  getWhatsAppLogs,
} from '../services/whatsappClient.js';
import { DEMO_PHONE_NUMBERS, TEST_CUSTOMER_PROFILES } from '../config/demoNumbers.js';
import { RecoveryCase } from '../models/RecoveryCase.js';
import { isDbConnected } from '../config/db.js';
import { inMemoryCases } from '../controllers/caseController.js';

const router = express.Router();

/**
 * GET /api/whatsapp/status
 * Returns real-time connection state, QR data URL if awaiting link, and client device info
 */
router.get('/status', (req, res) => {
  try {
    const status = getWhatsAppStatus();
    res.json({
      success: true,
      data: status,
      isConnected: status.isConnected,
      isReady: status.isReady,
      readyTimestamp: status.readyTimestamp,
      qrCodeData: status.qrCodeData,
      clientInfo: status.clientInfo,
      demoNumbers: DEMO_PHONE_NUMBERS,
      testProfiles: TEST_CUSTOMER_PROFILES,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/reconnect
 * Destroys existing Puppeteer instance, purges auth directory, and restarts pairing flow
 */
router.post('/reconnect', async (req, res) => {
  try {
    console.log('[API /api/whatsapp/reconnect] Resetting session on operator request...');
    await disconnectSession();
    res.json({
      success: true,
      message: 'WhatsApp session reset initiated. Generating new QR code for device pairing.',
      status: getWhatsAppStatus(),
    });
  } catch (err) {
    console.error('Error during WhatsApp reconnect:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/send-recovery
 * Dispatches live recovery message to customer WhatsApp
 */
router.post('/send-recovery', async (req, res) => {
  try {
    const { phone, customerName, amount, failureReason, caseId } = req.body;
    const result = await sendRecoveryWhatsApp({
      phone: phone || DEMO_PHONE_NUMBERS.CUSTOMER_1,
      customerName: customerName || 'Rahul Sharma',
      amount: amount || 4999,
      failureReason: failureReason || 'HDFC Bank 3D-Secure timeout on UPI rail',
      caseId: caseId || 'RCV-9842',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/whatsapp/logs
 * Fetches global telemetry stream of inbound & outbound interactions
 */
router.get('/logs', (req, res) => {
  try {
    const logs = getWhatsAppLogs();
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/whatsapp/logs/:caseId
 * Fetches full inbound/outbound interaction log & thread for a specific case
 */
router.get('/logs/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const memoryLogs = getWhatsAppLogs(caseId);

    let caseData = null;
    if (isDbConnected) {
      caseData = await RecoveryCase.findOne({
        $or: [{ caseId }, { caseNumber: caseId }],
      });
    }

    if (!caseData) {
      caseData = inMemoryCases.find(
        (c) => c.caseId === caseId || c.caseNumber === caseId
      );
    }

    res.json({
      success: true,
      caseId,
      thread: caseData?.whatsappThread || null,
      whatsappStatus: caseData?.whatsappStatus || 'NOT_SENT',
      whatsappMessageId: caseData?.whatsappMessageId || null,
      timelineEvents: (caseData?.timeline || []).filter(
        (e) =>
          e.actor?.toLowerCase().includes('whatsapp') ||
          e.event?.toLowerCase().includes('whatsapp')
      ),
      telemetryLogs: memoryLogs,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
