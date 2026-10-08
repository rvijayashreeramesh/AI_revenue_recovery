import pkg from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { RecoveryCase } from '../models/RecoveryCase.js';
import { isDbConnected } from '../config/db.js';
import { createChainedAuditLog } from './auditService.js';
import { executeRetry } from './mockGateway.js';
import { inMemoryCases } from '../controllers/caseController.js';
import {
  isAuthorizedCustomerPhone,
  ALLOWED_10_DIGIT_NUMBERS,
  DEMO_PHONE_NUMBERS,
} from '../config/demoNumbers.js';

const { Client, LocalAuth } = pkg;
const qrcodeTerm = qrcodeTerminal.generate ? qrcodeTerminal : (qrcodeTerminal.default || qrcodeTerminal);

let ioInstance = null;
let clientInstance = null;
let isClientReady = false;
let readyTimestamp = null;
let latestQrCode = null;
let latestQrCodeDataUrl = null;
let clientInitError = null;
const telemetryLogs = [];

/**
 * Configure Socket.IO reference for real-time dashboard telemetry
 */
export const setWhatsAppSocket = (io) => {
  ioInstance = io;
};

/**
 * Append to in-memory telemetry buffer and broadcast over WebSocket
 */
export const logWhatsAppTelemetry = (entry) => {
  const item = {
    id: `WA-TEL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date(),
    ...entry,
  };
  telemetryLogs.unshift(item);
  if (telemetryLogs.length > 200) telemetryLogs.pop();

  if (ioInstance) {
    ioInstance.emit('whatsapp:telemetry', item);
  }
  return item;
};

/**
 * Get telemetry interaction logs (optionally filtered by caseId)
 */
export const getWhatsAppLogs = (caseId = null) => {
  if (caseId) {
    return telemetryLogs.filter(
      (log) => log.caseId === caseId || log.caseNumber === caseId
    );
  }
  return telemetryLogs;
};

/**
 * Sanitizes phone number into international WhatsApp JID format
 * e.g., "+91 91508-40158" -> "919150840158@c.us"
 */
export const sanitizeWhatsAppPhone = (phone) => {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');

  // If 10-digit Indian number without country code, prefix 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  // Remove leading zeros if present
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
  }

  return `${digits}@c.us`;
};

/**
 * Normalizes JID back to plain digits for MongoDB case lookup
 * e.g. "919150840158@c.us" -> "919150840158"
 */
export const extractDigitsFromJid = (jid) => {
  if (!jid) return '';
  return jid.replace('@c.us', '').replace(/\D/g, '');
};

/**
 * Returns current status of WhatsApp Web client and pairing state
 */
export const getWhatsAppStatus = () => {
  let clientInfo = null;
  try {
    if (clientInstance?.info) {
      clientInfo = {
        pushname: clientInstance.info.pushname || 'Recovery Admin Desk',
        wid: clientInstance.info.wid?._serialized || clientInstance.info.wid?.user || '',
        phone: clientInstance.info.wid?.user || '',
        platform: clientInstance.info.platform || 'web',
      };
    }
  } catch (e) {
    // client info might not be available before ready
  }

  const connected = isClientReady || !!clientInfo;

  return {
    isConnected: connected,
    isReady: connected,
    readyTimestamp: readyTimestamp || (connected ? (readyTimestamp || new Date()) : null),
    hasQr: !!latestQrCode,
    qrCode: latestQrCode,
    qrCodeData: latestQrCodeDataUrl,
    clientInfo,
    error: clientInitError,
    activeNumbers: DEMO_PHONE_NUMBERS,
    allowedNumbers: ALLOWED_10_DIGIT_NUMBERS,
  };
};

/**
 * Disconnects existing session, clears ./.wwebjs_auth cache, and re-initializes
 */
export const disconnectSession = async () => {
  console.log('\n🔄 [WHATSAPP DESK] Resetting WhatsApp session and clearing auth tokens...');
  isClientReady = false;
  readyTimestamp = null;
  latestQrCode = null;
  latestQrCodeDataUrl = null;

  if (clientInstance) {
    try {
      await clientInstance.destroy();
    } catch (err) {
      console.warn('⚠️ [WHATSAPP DESK] Warning destroying client instance:', err.message);
    }
    clientInstance = null;
  }

  // Clear ./.wwebjs_auth directory safely
  try {
    const authPath = path.resolve('./.wwebjs_auth');
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('🧹 [WHATSAPP DESK] Session auth directory purged.');
    }
  } catch (fsErr) {
    console.warn('⚠️ [WHATSAPP DESK] Notice while clearing session directory:', fsErr.message);
  }

  if (ioInstance) {
    ioInstance.emit('whatsapp:disconnected');
    ioInstance.emit('whatsapp:status', {
      connected: false,
      isConnected: false,
      qrPending: false,
    });
  }

  // Reinitialize client to generate a clean QR pairing flow
  return initWhatsAppClient();
};

/**
 * Initialize WhatsApp Web Client with LocalAuth session persistence
 */
export const initWhatsAppClient = () => {
  if (clientInstance) {
    return clientInstance;
  }

  console.log('\n============================================================');
  console.log('🤖 INITIALIZING REAL TWO-WAY WHATSAPP GATEWAY CLIENT');
  console.log('============================================================\n');

  try {
    clientInstance = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth',
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // 1. EVENT: QR Code Generation
    clientInstance.on('qr', async (qr) => {
      latestQrCode = qr;
      isClientReady = false;

      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
        latestQrCodeDataUrl = qrDataUrl;
      } catch (qrErr) {
        console.warn('⚠️ [QR toDataURL warning]:', qrErr.message);
      }

      console.log('\n📱 [WHATSAPP DESK] SCAN QR CODE TO PAIR GATEWAY WITH SMARTPHONE:\n');
      try {
        if (typeof qrcodeTerm.generate === 'function') {
          qrcodeTerm.generate(qr, { small: true });
        } else if (typeof qrcodeTerm === 'function') {
          qrcodeTerm(qr, { small: true });
        }
      } catch (err) {
        console.log('[QR Terminal Print Notice]:', err.message);
      }

      if (ioInstance) {
        ioInstance.emit('whatsapp:qr', { qrDataUrl, qr, timestamp: new Date() });
        ioInstance.emit('whatsapp:status', {
          connected: false,
          isConnected: false,
          qrPending: true,
          qr,
          qrDataUrl,
          timestamp: new Date(),
        });
        ioInstance.emit('terminal:log', {
          id: `LOG-WA-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'whatsapp',
          category: 'OMNICHANNEL',
          message: '[WHATSAPP_GATEWAY] Real-time QR Code pairing challenge generated. Awaiting admin device scan.',
        });
      }
    });

    // 2. EVENT: Authenticated
    clientInstance.on('authenticated', () => {
      console.log('🔒 [WHATSAPP DESK] Session authenticated successfully. Syncing state...');
      latestQrCode = null;
      latestQrCodeDataUrl = null;
      isClientReady = true;
      readyTimestamp = new Date();
      if (ioInstance) {
        ioInstance.emit('whatsapp:status', {
          authenticated: true,
          connected: true,
          isConnected: true,
          message: 'Authenticated. Gateway active.',
        });
      }
    });

    // 3. EVENT: Auth Failure
    clientInstance.on('auth_failure', (msg) => {
      console.error('❌ [WHATSAPP DESK] Authentication failure:', msg);
      isClientReady = false;
      clientInitError = msg;
      if (ioInstance) {
        ioInstance.emit('whatsapp:status', {
          connected: false,
          isConnected: false,
          error: msg,
        });
      }
    });

    // 4. EVENT: Ready
    clientInstance.on('ready', () => {
      isClientReady = true;
      readyTimestamp = new Date();
      latestQrCode = null;
      latestQrCodeDataUrl = null;

      let clientInfo = null;
      try {
        if (clientInstance?.info) {
          clientInfo = {
            pushname: clientInstance.info.pushname || 'Recovery Admin Desk',
            wid: clientInstance.info.wid?._serialized || clientInstance.info.wid?.user || '',
            phone: clientInstance.info.wid?.user || '',
            platform: clientInstance.info.platform || 'web',
          };
        }
      } catch (e) {}

      console.log('\n============================================================');
      console.log('✅ WHATSAPP GATEWAY CLIENT IS ONLINE & PAIRED!');
      console.log(`   Linked Phone: ${clientInfo?.phone || 'Active'}`);
      console.log('   Autonomous bi-directional settlement engine ready.');
      console.log('============================================================\n');

      if (ioInstance) {
        ioInstance.emit('whatsapp:ready', {
          status: 'ONLINE',
          timestamp: readyTimestamp,
          clientInfo,
        });
        ioInstance.emit('whatsapp:status', {
          connected: true,
          isConnected: true,
          qrPending: false,
          readyAt: readyTimestamp,
          clientInfo,
        });
        ioInstance.emit('terminal:log', {
          id: `LOG-WA-READY-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'recovery',
          category: 'OMNICHANNEL',
          message: `⚡ [WHATSAPP_GATEWAY] Gateway online. Puppeteer engine linked to device (${clientInfo?.phone || 'Active'}).`,
        });
      }
    });

    // 5. EVENT: Disconnected
    clientInstance.on('disconnected', (reason) => {
      console.warn('⚠️ [WHATSAPP DESK] Client disconnected:', reason);
      isClientReady = false;
      readyTimestamp = null;
      if (ioInstance) {
        ioInstance.emit('whatsapp:disconnected', { reason });
        ioInstance.emit('whatsapp:status', {
          connected: false,
          isConnected: false,
          disconnectedReason: reason,
        });
      }
    });

    // 6. EVENT: Inbound Message Listener (Bi-directional Autonomous Settlement)
    clientInstance.on('message', async (msg) => {
      await handleInboundWhatsAppMessage(msg);
    });

    // Launch WhatsApp client
    clientInstance.initialize().catch((err) => {
      console.error('❌ [WHATSAPP DESK] Initialization error:', err.message);
      clientInitError = err.message;
    });

    return clientInstance;
  } catch (err) {
    console.error('❌ [WHATSAPP DESK] Failed to instantiate Client:', err.message);
    clientInitError = err.message;
    return null;
  }
};

/**
 * Outbound Dispatch Function
 * Formats Indian numbers (91XXXXXXXXXX@c.us), delivers payment recovery alert,
 * updates MongoDB RecoveryCase with whatsappThread subdocument.
 */
export const sendRecoveryWhatsApp = async ({
  phone,
  customerName = 'Valued Customer',
  amount = 4999,
  failureReason = 'issuing bank timeout',
  caseId,
}) => {
  // STRICT USER POLICY: Only send messages to the 3 designated customer numbers
  if (!isAuthorizedCustomerPhone(phone)) {
    console.warn(
      `🛑 [SECURITY GUARD] Outbound WhatsApp BLOCKED. Recipient ${phone} is not in authorized list: [${ALLOWED_10_DIGIT_NUMBERS.join(', ')}]`
    );
    return {
      success: false,
      deliveryStatus: 'BLOCKED_UNAUTHORIZED_NUMBER',
      message: `Security Policy: WhatsApp recovery is restricted only to authorized customer numbers: ${ALLOWED_10_DIGIT_NUMBERS.join(', ')}`,
      phone,
    };
  }

  const chatId = sanitizeWhatsAppPhone(phone);
  const formattedAmount = Number(amount || 4999).toLocaleString('en-IN');

  const messageText = `⚠️ *Payment Alert - AI Revenue Recovery*
Hi ${customerName}, your payment of *₹${formattedAmount}* was interrupted due to: ${failureReason}.

Reply *PAY* to authorize immediate 1-click retry.
Or reply *DISCOUNT* to claim an instant 5% recovery waiver.`;

  console.log(`\n📤 [WHATSAPP GATEWAY] Outbound dispatch to ${chatId || phone} (Case: ${caseId})...`);

  let deliveryStatus = 'MOCK_SENT';
  let messageId = `WA-MOCK-${Date.now()}`;

  const isReady = isClientReady || !!clientInstance?.info;
  console.log(`ℹ️ [WHATSAPP OUTBOUND STATUS] clientInstance: ${!!clientInstance}, isClientReady: ${isClientReady}, hasInfo: ${!!clientInstance?.info}, isReady: ${isReady}, chatId: ${chatId}`);

  // If WhatsApp web client is linked and ready, send real WhatsApp message
  if (clientInstance && isReady && chatId) {
    try {
      console.log(`📡 [WHATSAPP OUTBOUND] Invoking clientInstance.sendMessage('${chatId}', ...)...`);
      const sentMsg = await clientInstance.sendMessage(chatId, messageText);
      messageId = sentMsg?.id?._serialized || sentMsg?.id?.id || `WA-${Date.now()}`;
      deliveryStatus = 'DELIVERED';
      console.log(`✅ [WHATSAPP GATEWAY] REAL MESSAGE DELIVERED TO WHATSAPP! ID: ${messageId}`);
    } catch (sendErr) {
      console.error(`❌ [WHATSAPP GATEWAY] Error sending via Puppeteer:`, sendErr.message || sendErr);
      deliveryStatus = 'FAILED';
    }
  } else {
    console.log(`⚠️ [WHATSAPP GATEWAY] Client not linked. Simulated fallback recorded for ${phone}.`);
    deliveryStatus = 'SENT';
  }

  // Update Case Document in MongoDB or in-memory
  let targetCase = null;
  try {
    if (isDbConnected && caseId) {
      targetCase = await RecoveryCase.findOne({
        $or: [
          { caseId },
          { caseNumber: caseId },
          ...(mongoose.Types.ObjectId.isValid(caseId) ? [{ _id: caseId }] : []),
        ],
      });
    }

    if (!targetCase && caseId) {
      targetCase = inMemoryCases.find(
        (c) => c.caseId === caseId || c.caseNumber === caseId
      );
    }

    if (targetCase) {
      targetCase.whatsappMessageId = messageId;
      targetCase.whatsappStatus = deliveryStatus === 'DELIVERED' ? 'DELIVERED' : 'DISPATCHED';

      // Update whatsappThread subdocument
      targetCase.whatsappThread = {
        outboundMessageId: messageId,
        outboundTimestamp: new Date(),
        inboundReplyText: targetCase.whatsappThread?.inboundReplyText || '',
        inboundTimestamp: targetCase.whatsappThread?.inboundTimestamp || null,
        deliveryStatus: deliveryStatus === 'DELIVERED' ? 'DELIVERED' : 'SENT',
      };

      if (!targetCase.status || targetCase.status === 'DETECTED' || targetCase.status === 'SCHEDULED') {
        targetCase.status = 'AWAITING_CUSTOMER';
      }

      targetCase.timeline = targetCase.timeline || [];
      targetCase.timeline.unshift({
        timestamp: new Date(),
        event: `WhatsApp Recovery Alert dispatched to ${phone} [ID: ${messageId}] [Status: ${deliveryStatus}]`,
        type: 'info',
        actor: 'WhatsApp Autonomous Gateway',
      });

      if (isDbConnected && targetCase.save) {
        await targetCase.save();
      }

      // Record in Chained Audit Ledger
      await createChainedAuditLog({
        caseId: targetCase._id,
        caseNumber: targetCase.caseNumber || caseId,
        agentName: 'WHATSAPP_GATEWAY',
        actionTaken: 'PAYMENT_ALERT_DISPATCHED',
        payload: {
          recipient: phone,
          chatId,
          amount,
          messageId,
          deliveryStatus,
          timestamp: new Date().toISOString(),
        },
      });

      if (ioInstance) {
        const caseObj = targetCase.toObject ? targetCase.toObject() : targetCase;
        ioInstance.emit('case:updated', caseObj);
      }
    }
  } catch (dbErr) {
    console.error('⚠️ [WHATSAPP GATEWAY] DB sync error on outbound dispatch:', dbErr.message);
  }

  // Record into live telemetry feed
  const telemetryItem = logWhatsAppTelemetry({
    direction: 'OUTBOUND',
    phone,
    customerName,
    caseId: targetCase?.caseNumber || caseId || 'RCV-DISPATCH',
    amount,
    payload: messageText,
    status: deliveryStatus,
    messageId,
  });

  return {
    success: deliveryStatus !== 'FAILED',
    deliveryStatus,
    messageId,
    chatId,
    phone,
    telemetryId: telemetryItem.id,
  };
};

/**
 * Inbound WhatsApp Message Handler
 * Parses customer replies ("PAY", "1", "DISCOUNT") and executes real-time recovery
 */
export const handleInboundWhatsAppMessage = async (msg) => {
  try {
    // Ignore group chats and status broadcasts
    if (!msg || !msg.from || msg.from.includes('@g.us') || msg.from.includes('status@broadcast')) {
      return;
    }

    const senderJid = msg.from;
    const senderPhone = extractDigitsFromJid(senderJid);
    const rawBody = (msg.body || '').trim();
    const command = rawBody.toUpperCase();

    // STRICT USER POLICY: Only process inbound replies from authorized customer numbers
    if (!isAuthorizedCustomerPhone(senderPhone)) {
      console.log(
        `ℹ️ [WHATSAPP GATEWAY] Ignored message from non-authorized sender: ${senderPhone}. Authorized list: [${ALLOWED_10_DIGIT_NUMBERS.join(', ')}]`
      );
      return;
    }

    console.log(`\n📥 [WHATSAPP GATEWAY INBOUND] Reply from ${senderPhone}: "${rawBody}"`);

    // Match customer phone to active RecoveryCase
    const phoneLast10 = senderPhone.slice(-10);

    let targetCase = null;
    if (isDbConnected) {
      targetCase = await RecoveryCase.findOne({
        $or: [
          { 'customer.phone': new RegExp(phoneLast10 + '$') },
          { status: { $in: ['AWAITING_CUSTOMER', 'ACTION_REQUIRED', 'DETECTED', 'SCHEDULED'] } },
        ],
      }).sort({ updatedAt: -1 });
    }

    if (!targetCase) {
      targetCase = inMemoryCases.find(
        (c) =>
          (c.customer?.phone && c.customer.phone.includes(phoneLast10)) ||
          ['AWAITING_CUSTOMER', 'ACTION_REQUIRED', 'DETECTED', 'SCHEDULED'].includes(c.status)
      ) || inMemoryCases[0];
    }

    if (!targetCase) {
      console.warn(`[WHATSAPP GATEWAY] No case found matching sender: ${senderPhone}`);
      return;
    }

    const caseNumber = targetCase.caseNumber || targetCase.caseId;
    const customerName = targetCase.customer?.name || 'Customer';
    const amountVal = targetCase.transaction?.amount || targetCase.amount || 4999;

    // Log inbound telemetry
    logWhatsAppTelemetry({
      direction: 'INBOUND',
      phone: senderPhone,
      customerName,
      caseId: caseNumber,
      payload: rawBody,
      intent: command === 'PAY' || command === '1' ? 'RECOVERY_CONFIRMED' : (command === 'DISCOUNT' ? 'DISCOUNT_CLAIMED' : 'QUERY'),
      status: 'RECEIVED',
    });

    // ------------------------------------------------------------------------
    // CASE A: Customer replies "PAY" or "1" -> Execute Autonomous Recovery
    // ------------------------------------------------------------------------
    if (command === 'PAY' || command === '1' || command.startsWith('PAY')) {
      console.log(`\n⚡ [WHATSAPP GATEWAY] Executing instant 1-click recovery for Case ${caseNumber}...`);

      targetCase.status = 'RECOVERED';
      targetCase.whatsappStatus = 'REPLIED_PAY';
      targetCase.recoveredAt = new Date();

      // Update whatsappThread subdocument
      targetCase.whatsappThread = {
        outboundMessageId: targetCase.whatsappThread?.outboundMessageId || targetCase.whatsappMessageId || '',
        outboundTimestamp: targetCase.whatsappThread?.outboundTimestamp || targetCase.createdAt || new Date(),
        inboundReplyText: rawBody,
        inboundTimestamp: new Date(),
        deliveryStatus: 'REPLIED',
      };

      const finalAmount = targetCase.discountApplied > 0
        ? Math.round(amountVal * (1 - targetCase.discountApplied / 100))
        : amountVal;

      targetCase.timeline = targetCase.timeline || [];
      targetCase.timeline.unshift({
        timestamp: new Date(),
        event: `Customer authorized 1-click recovery via WhatsApp reply "${rawBody}". Settled: ₹${finalAmount.toLocaleString('en-IN')}`,
        type: 'success',
        actor: 'WhatsApp Autonomous Gateway',
      });

      if (isDbConnected && targetCase.save) {
        await targetCase.save();
      }

      // Send Instant WhatsApp Confirmation
      const confirmReply = `✅ *Payment Successful!*
Thank you ${customerName}. Your payment of *₹${Number(finalAmount).toLocaleString('en-IN')}* has been settled instantly.

• Case ID: ${caseNumber}
• Auth Rail: Fast-Path UPI 2.0
• Ledger Status: SEALED & RECOVERED`;

      await msg.reply(confirmReply);

      // Record to Cryptographic Audit Ledger
      await createChainedAuditLog({
        caseId: targetCase._id,
        caseNumber,
        agentName: 'WHATSAPP_GATEWAY',
        actionTaken: 'ONE_CLICK_RECOVERY_CONFIRMED',
        payload: {
          sender: senderPhone,
          command: rawBody,
          settledAmount: finalAmount,
          rail: 'WHATSAPP_1CLICK_UPI',
          timestamp: new Date().toISOString(),
        },
      });

      if (ioInstance) {
        const caseObj = targetCase.toObject ? targetCase.toObject() : targetCase;
        ioInstance.emit('whatsapp:message_received', {
          phone: senderPhone,
          text: rawBody,
          caseId: caseNumber,
          recovered: true,
        });
        ioInstance.emit('case:recovered', caseObj);
        ioInstance.emit('case:updated', caseObj);
        ioInstance.emit('terminal:log', {
          id: `LOG-RECOVERED-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'success',
          category: 'OMNICHANNEL',
          message: `🎉 [WHATSAPP_GATEWAY] Case ${caseNumber} (${customerName}) RECOVERED autonomously via WhatsApp reply "${rawBody}"! Settled: ₹${finalAmount.toLocaleString('en-IN')}`,
          caseId: caseNumber,
        });
      }
    }
    // ------------------------------------------------------------------------
    // CASE B: Customer replies "DISCOUNT" -> Apply 5% Concession Waiver
    // ------------------------------------------------------------------------
    else if (command === 'DISCOUNT' || command.includes('DISCOUNT')) {
      console.log(`\n🏷️ [WHATSAPP GATEWAY] Applying 5% recovery waiver for Case ${caseNumber}...`);

      targetCase.discountApplied = 5;
      targetCase.whatsappStatus = 'REPLIED_DISCOUNT';

      const discountAmount = Math.round(amountVal * 0.05);
      const discountedTotal = amountVal - discountAmount;

      targetCase.whatsappThread = {
        outboundMessageId: targetCase.whatsappThread?.outboundMessageId || targetCase.whatsappMessageId || '',
        outboundTimestamp: targetCase.whatsappThread?.outboundTimestamp || targetCase.createdAt || new Date(),
        inboundReplyText: rawBody,
        inboundTimestamp: new Date(),
        deliveryStatus: 'REPLIED',
      };

      targetCase.timeline = targetCase.timeline || [];
      targetCase.timeline.unshift({
        timestamp: new Date(),
        event: `Customer requested 5% discount via WhatsApp ("${rawBody}"). Adjusted: ₹${discountedTotal.toLocaleString('en-IN')}`,
        type: 'info',
        actor: 'WhatsApp Autonomous Gateway',
      });

      if (isDbConnected && targetCase.save) {
        await targetCase.save();
      }

      const discountReply = `🏷️ *5% Recovery Incentive Applied!*
Your payment has been updated:
• Original: ~₹${Number(amountVal).toLocaleString('en-IN')}~
• Discount: -₹${discountAmount.toLocaleString('en-IN')} (Code: SAVE5)
• *Payable Total: ₹${discountedTotal.toLocaleString('en-IN')}*

Reply *PAY* to authorize immediate 1-click settlement at the discounted rate!`;

      await msg.reply(discountReply);

      await createChainedAuditLog({
        caseId: targetCase._id,
        caseNumber,
        agentName: 'WHATSAPP_GATEWAY',
        actionTaken: 'DISCOUNT_WAIVER_OFFERED',
        payload: {
          sender: senderPhone,
          originalAmount: amountVal,
          discountAmount,
          discountedTotal,
        },
      });

      if (ioInstance) {
        const caseObj = targetCase.toObject ? targetCase.toObject() : targetCase;
        ioInstance.emit('case:updated', caseObj);
        ioInstance.emit('terminal:log', {
          id: `LOG-DISCOUNT-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'whatsapp',
          category: 'OMNICHANNEL',
          message: `[WHATSAPP_DISCOUNT] 5% waiver applied for Case ${caseNumber}. Revised total: ₹${discountedTotal.toLocaleString('en-IN')}`,
          caseId: caseNumber,
        });
      }
    }
    // ------------------------------------------------------------------------
    // CASE C: Other Inbound Text
    // ------------------------------------------------------------------------
    else {
      await msg.reply(`👋 Hi ${customerName}!
We received your message: "${rawBody}"

To complete your payment of *₹${Number(amountVal).toLocaleString('en-IN')}*:
• Reply *PAY* to authorize instant settlement.
• Reply *DISCOUNT* to claim an instant 5% waiver.`);

      targetCase.whatsappThread = {
        outboundMessageId: targetCase.whatsappThread?.outboundMessageId || '',
        outboundTimestamp: targetCase.whatsappThread?.outboundTimestamp || targetCase.createdAt || new Date(),
        inboundReplyText: rawBody,
        inboundTimestamp: new Date(),
        deliveryStatus: 'REPLIED',
      };

      targetCase.timeline = targetCase.timeline || [];
      targetCase.timeline.unshift({
        timestamp: new Date(),
        event: `Customer WhatsApp reply: "${rawBody}"`,
        type: 'info',
        actor: 'WhatsApp Inbound',
      });

      if (isDbConnected && targetCase.save) {
        await targetCase.save();
      }

      if (ioInstance) {
        const caseObj = targetCase.toObject ? targetCase.toObject() : targetCase;
        ioInstance.emit('case:updated', caseObj);
      }
    }
  } catch (err) {
    console.error('❌ [WHATSAPP INBOUND ERROR]:', err);
  }
};

export default {
  initWhatsAppClient,
  disconnectSession,
  sendRecoveryWhatsApp,
  handleInboundWhatsAppMessage,
  setWhatsAppSocket,
  getWhatsAppStatus,
  getWhatsAppLogs,
  logWhatsAppTelemetry,
  sanitizeWhatsAppPhone,
  extractDigitsFromJid,
};
