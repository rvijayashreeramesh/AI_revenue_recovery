import mongoose from 'mongoose';
import { inMemoryCases } from './caseController.js';
import { RecoveryCase } from '../models/RecoveryCase.js';
import { isDbConnected } from '../config/db.js';
import { AuditService } from '../services/auditService.js';
import { AiDiagnosisService } from '../services/aiDiagnosisService.js';
import { MockGatewayService } from '../services/mockGateway.js';
import { sendRecoveryWhatsApp } from '../services/whatsappClient.js';
import { DEMO_PHONE_NUMBERS } from '../config/demoNumbers.js';

export const injectSyntheticFailure = async (req, res) => {
  try {
    const raw = MockGatewayService.generateSyntheticEvent();
    const newCaseId = `RC-${Math.floor(1000 + Math.random() * 9000)}`;

    const names = [
      'David Miller (Apex Dynamics)',
      'Amina Tariq (Kestrel Defense)',
      'Christian Cole (Atlas BioTech)',
      'Sarah Jenkins (FinVantage)',
    ];
    const pickedName = names[Math.floor(Math.random() * names.length)];

    const newCase = {
      caseId: newCaseId,
      transactionId: raw.transactionId,
      customer: {
        id: `cust_${Math.random().toString(36).substring(2, 7)}`,
        name: pickedName.split(' (')[0],
        email: `${pickedName.split(' ')[0].toLowerCase()}@corp.io`,
        phone: '+1 (555) 019-8833',
        company: pickedName.split('(')[1]?.replace(')', '') || 'Enterprise Co',
        tier: raw.tier,
        mrr: raw.amount,
        timezone: 'America/New_York',
      },
      amount: raw.amount,
      currency: 'USD',
      status: 'diagnosing',
      riskScore: Math.floor(45 + Math.random() * 50),
      failureCode: raw.failureCode,
      failureReason: raw.failureReason,
      gateway: ['Stripe', 'Adyen', 'Checkout.com'][Math.floor(Math.random() * 3)],
      attempts: 1,
      maxAttempts: 4,
      recoveredAmount: 0,
      aiDiagnosis: {
        rootCause: 'Analyzing telemetry against issuing card switch...',
        confidenceScore: 0.88,
        recommendedAction: 'Synthesizing adaptive retry strategy...',
        suggestedChannel: 'webhook_retry',
        sentimentAnalysis: 'Account in good credit standing.',
        optimalContactWindow: 'Immediate',
        modelUsed: 'Groq / Gemini AI',
        reasoningChain: ['Inbound decline webhook received.', 'Initiating risk score matrix.'],
      },
      timeline: [
        {
          timestamp: new Date(),
          event: `Inbound Payment Authorization Failure: [${raw.failureCode}]`,
          type: 'warning',
          actor: 'Payment Gateway Webhook',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryCases.unshift(newCase);

    await AuditService.record({
      caseId: newCase.caseId,
      action: 'CASE_CREATED',
      actor: 'SYNTHETIC_INJECTOR',
      category: 'GATEWAY',
      details: { amount: newCase.amount, failureCode: newCase.failureCode },
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('case:new', newCase);
    }

    // Automatically trigger AI diagnosis in background
    setTimeout(async () => {
      try {
        const diag = await AiDiagnosisService.diagnoseCase(newCase);
        newCase.aiDiagnosis = diag;
        newCase.status = 'action_required';
        newCase.timeline.unshift({
          timestamp: new Date(),
          event: `AI Root Cause Diagnosis complete: [${diag.suggestedChannel}]`,
          type: 'ai_decision',
          actor: diag.modelUsed,
        });

        await AuditService.record({
          caseId: newCase.caseId,
          action: 'AI_DIAGNOSIS_COMPLETED',
          actor: diag.modelUsed,
          category: 'AI_INFERENCE',
          details: diag,
        });

        if (req.app.get('io')) {
          req.app.get('io').emit('case:updated', newCase);
        }
      } catch (e) {
        console.error('[Simulator] Auto-diagnosis error:', e);
      }
    }, 1200);

    res.json({ success: true, data: newCase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const simulateWhatsAppAction = async (req, res) => {
  try {
    const { caseId, actionType, customerReply, discountPercentage = 5 } = req.body;
    let target = inMemoryCases.find(
      (c) => c.caseId === caseId || c.caseNumber === caseId || (c._id && String(c._id) === caseId)
    );

    let dbTarget = null;
    if (isDbConnected) {
      try {
        dbTarget = await RecoveryCase.findOne({
          $or: [
            { caseId },
            { caseNumber: caseId },
            ...(mongoose.Types.ObjectId.isValid(caseId) ? [{ _id: caseId }] : []),
          ],
        });
      } catch (e) {
        console.warn('[simulateWhatsAppAction] DB lookup error:', e.message);
      }
    }

    if (!target && !dbTarget) {
      target = inMemoryCases[0] || {
        caseId: caseId || 'RC-9842',
        customer: { name: 'Rahul Sharma', company: 'Apex Retails', phone: DEMO_PHONE_NUMBERS.CUSTOMER_1 },
        amount: 4999,
        currency: 'INR',
        status: 'action_required',
        timeline: [],
      };
    }

    const effectiveTarget = dbTarget || target;
    const amountVal = effectiveTarget.transaction?.amount || effectiveTarget.amount || 4999;
    const customerName = effectiveTarget.customer?.name || 'Rahul Sharma';
    let responsePayload = {};

    if (actionType === 'send_reminder') {
      const recipientPhone = effectiveTarget.customer?.phone || DEMO_PHONE_NUMBERS.CUSTOMER_1;
      const logEvent = {
        timestamp: new Date(),
        event: `WhatsApp Interactive Recovery Notification dispatched to ${recipientPhone}`,
        type: 'info',
        actor: 'WhatsApp Recovery Engine',
      };
      if (target?.timeline) target.timeline.unshift(logEvent);
      if (dbTarget) {
        dbTarget.timeline = dbTarget.timeline || [];
        dbTarget.timeline.unshift(logEvent);
        await dbTarget.save();
      }

      // Dispatch real WhatsApp message if client is linked
      sendRecoveryWhatsApp({
        phone: recipientPhone,
        customerName,
        amount: amountVal,
        failureReason: effectiveTarget.transaction?.errorDescription || 'HDFC bank 3D-Secure timeout',
        caseId: effectiveTarget.caseId || caseId,
      }).catch((e) => console.warn('[simulateWhatsAppAction] Outbound send warning:', e.message));

      await AuditService.record({
        caseId: effectiveTarget.caseId || caseId,
        action: 'WHATSAPP_DISPATCHED',
        actor: 'OMNICHANNEL_BOT',
        category: 'OMNICHANNEL',
        details: { phone: recipientPhone, template: 'cart_reservation_1click_pay' },
      });

      responsePayload = {
        message: `Hi ${customerName}, your order of ₹${Number(amountVal).toLocaleString('en-IN')} was paused due to an HDFC bank timeout. We've reserved your cart! Tap below to finish securely via alternate UPI or card.`,
        suggestedActions: [
          '⚡ 1-Click Pay via Google Pay / PhonePe',
          '🏷️ Apply 5% Recovery Discount',
          '💬 Talk to Agent',
        ],
      };
    } else if (actionType === 'apply_discount') {
      const discountAmount = Math.round((amountVal * discountPercentage) / 100);
      const discountedTotal = amountVal - discountAmount;
      const logEvent = {
        timestamp: new Date(),
        event: `Applied ${discountPercentage}% recovery incentive (-₹${discountAmount.toLocaleString('en-IN')}) for ${customerName}`,
        type: 'info',
        actor: 'Autonomous Discount Engine',
      };
      if (target?.timeline) target.timeline.unshift(logEvent);
      if (dbTarget) {
        dbTarget.timeline = dbTarget.timeline || [];
        dbTarget.timeline.unshift(logEvent);
        await dbTarget.save();
      }

      await AuditService.record({
        caseId: effectiveTarget.caseId || caseId,
        action: 'DISCOUNT_APPLIED',
        actor: 'AUTONOMOUS_POLICY_ENGINE',
        category: 'OMNICHANNEL',
        details: { originalAmount: amountVal, discountAmount, discountedTotal },
      });

      responsePayload = {
        reply: `🏷️ Promo code SAVE${discountPercentage} applied (-₹${discountAmount.toLocaleString('en-IN')})! Your updated total is ₹${discountedTotal.toLocaleString('en-IN')}. Tap 1-Click Pay to finish before reservation expires!`,
        discountedAmount: discountedTotal,
        discountAmount,
        recovered: false,
      };
    } else if (actionType === 'talk_to_agent') {
      const logEvent = {
        timestamp: new Date(),
        event: `Customer requested live agent support via WhatsApp chat`,
        type: 'warning',
        actor: 'WhatsApp Concierge',
      };
      if (target?.timeline) target.timeline.unshift(logEvent);
      if (dbTarget) {
        dbTarget.timeline = dbTarget.timeline || [];
        dbTarget.timeline.unshift(logEvent);
        await dbTarget.save();
      }

      await AuditService.record({
        caseId: effectiveTarget.caseId || caseId,
        action: 'AGENT_REQUESTED',
        actor: 'WHATSAPP_CONCIERGE',
        category: 'OMNICHANNEL',
        details: { customerReply: customerReply || 'Talk to Agent' },
      });

      responsePayload = {
        reply: `Connecting you to Priya from Priority Recovery Desk...\n\n"Hi ${customerName}! I'm Priya. I noticed the HDFC gateway timeout on your order of ₹${Number(amountVal).toLocaleString('en-IN')}. I've reserved your items—how would you prefer to complete payment (instant UPI QR, NetBanking, or card)?"`,
        agentName: 'Priya (Priority Recovery)',
        recovered: false,
      };
    } else {
      // actionType === 'one_click_pay' or 'customer_replied'
      const replyLower = (customerReply || '').toLowerCase();
      const isPositive =
        actionType === 'one_click_pay' ||
        replyLower.includes('paid') ||
        replyLower.includes('pay') ||
        replyLower.includes('google pay') ||
        replyLower.includes('phonepe') ||
        replyLower.includes('upi') ||
        replyLower.includes('updated') ||
        replyLower.includes('approve') ||
        replyLower.includes('yes');

      if (isPositive) {
        if (target) {
          target.status = 'RECOVERED';
          target.recoveredAmount = target.amount || amountVal;
          target.timeline = target.timeline || [];
          target.timeline.unshift({
            timestamp: new Date(),
            event: `Instant UPI settlement verified (Google Pay / PhonePe). Order #ORD-${target.caseId || '9842'} fulfilled.`,
            type: 'success',
            actor: 'UPI Fast-Pay Switch',
          });
        }

        if (dbTarget) {
          dbTarget.status = 'RECOVERED';
          dbTarget.timeline = dbTarget.timeline || [];
          dbTarget.timeline.unshift({
            timestamp: new Date(),
            event: `Instant UPI settlement verified (Google Pay / PhonePe). Order recovered.`,
            type: 'success',
            actor: 'UPI Fast-Pay Switch',
          });
          await dbTarget.save();
        }

        await AuditService.record({
          caseId: effectiveTarget.caseId || caseId,
          action: 'RECOVERY_COMPLETED',
          actor: 'WHATSAPP_UPI_1CLICK',
          category: 'OMNICHANNEL',
          details: {
            amount: amountVal,
            channel: 'whatsapp_upi',
            provider: 'Google Pay / PhonePe',
            status: 'RECOVERED',
          },
        });

        responsePayload = {
          reply: `🎉 Payment of ₹${Number(amountVal).toLocaleString('en-IN')} confirmed instantly via UPI! Your cart reservation is secured and your order is confirmed. A receipt has been sent to your email.`,
          recovered: true,
          amount: amountVal,
          transactionRef: `UPI-NPCI-${Math.floor(10000000 + Math.random() * 90000000)}`,
        };
      } else {
        const logEvent = {
          timestamp: new Date(),
          event: `Customer WhatsApp reply received: "${customerReply}"`,
          type: 'info',
          actor: 'WhatsApp Inbound',
        };
        if (target?.timeline) target.timeline.unshift(logEvent);
        if (dbTarget) {
          dbTarget.timeline = dbTarget.timeline || [];
          dbTarget.timeline.unshift(logEvent);
          await dbTarget.save();
        }

        responsePayload = {
          reply: `Thank you for your response, ${customerName}. We have extended your cart hold. Reply anytime or tap below to pay securely!`,
          recovered: false,
        };
      }
    }

    const updatedCase = dbTarget ? dbTarget.toObject() : target;

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.emit('case:updated', updatedCase);
      io.emit('terminal:log', {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: responsePayload.recovered ? 'recovery' : 'whatsapp',
        category: 'OMNICHANNEL',
        message: responsePayload.recovered
          ? `[WHATSAPP_RECOVERY] Order ${effectiveTarget.caseId || caseId} recovered for ₹${Number(amountVal).toLocaleString('en-IN')} via UPI 1-Click`
          : `[WHATSAPP] Event processed for case ${effectiveTarget.caseId || caseId}: ${actionType}`,
        caseId: effectiveTarget.caseId || caseId,
      });
    }

    res.json({ success: true, data: responsePayload, targetCase: updatedCase });
  } catch (error) {
    console.error('[simulateWhatsAppAction] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const simulateVoiceAgentTurn = async (req, res) => {
  try {
    const { caseId, userTranscript, sessionStep = 1 } = req.body;
    const target = inMemoryCases.find((c) => c.caseId === caseId) || inMemoryCases[0];

    const customerName = target?.customer?.name || 'Valued Partner';
    const amountVal = target?.transaction?.amount || target?.amount || 4999;
    const amountStr = `₹${Number(amountVal).toLocaleString('en-IN')}`;

    let agentResponse = '';
    let isFinished = false;
    let recovered = false;

    const trimmedInput = (userTranscript || '').trim();
    const lower = trimmedInput.toLowerCase();

    // 1. Audio & Transcription Error Handling
    if (!trimmedInput || trimmedInput.length < 2 || trimmedInput === '...' || trimmedInput === '[noise]') {
      agentResponse = "I couldn't quite hear you. Please ensure your microphone is enabled, or feel free to type your question below.";
    } else if (
      lower.includes('mic') ||
      lower.includes('microphone') ||
      lower.includes("can't hear") ||
      lower.includes('cannot hear')
    ) {
      agentResponse = "It looks like your microphone isn't picking up audio. Please check your browser's microphone permissions in the URL bar, or you can switch to typing your question.";
    }
    // 2. Initial Greeting if sessionStep is 0
    else if (sessionStep === 0) {
      agentResponse = `Hello ${customerName}, this is the AI Voice Concierge for AI Revenue Recovery regarding your recent interrupted charge of ${amountStr}. How can I assist you with completing this settlement today?`;
    }
    // 3. Spoken Re-Authorization & Settlement Flow
    else if (
      lower.includes('re-auth') ||
      lower.includes('retry') ||
      lower.includes('trigger') ||
      lower.includes('go ahead') ||
      lower.includes('authorize') ||
      lower.includes('pay now')
    ) {
      agentResponse = `Executing authorization on our secondary acquiring switch right now. Verified, the transaction for ${amountStr} has been successfully settled. I have sent the updated receipt to your email, have a wonderful day.`;
      isFinished = true;
      recovered = true;

      if (target) {
        target.status = 'recovered';
        target.recoveredAmount = amountVal;
        target.timeline = target.timeline || [];
        target.timeline.unshift({
          timestamp: new Date(),
          event: `Voice Concierge successfully re-authorized charge (${amountStr}) via spoken consent.`,
          type: 'success',
          actor: 'AI Voice Concierge',
        });

        await AuditService.record({
          caseId: target.caseId,
          action: 'RECOVERY_COMPLETED',
          actor: 'AI_VOICE_CONCIERGE',
          category: 'OMNICHANNEL',
          details: { amount: amountVal, channel: 'voice' },
        });

        if (req.app.get('io')) {
          req.app.get('io').emit('case:updated', target);
        }
      }
    } else if (lower.includes('whatsapp') || lower.includes('link') || lower.includes('text message')) {
      agentResponse = "Understood. I have dispatched a secure payment link directly to your WhatsApp desk. You can complete settlement in under thirty seconds.";
      isFinished = true;
    }
    // 4. In-Scope Project Inquiries (Key Features)
    else if (
      lower.includes('what is this') ||
      lower.includes('how does it work') ||
      lower.includes('feature') ||
      lower.includes('switch') ||
      lower.includes('rail') ||
      lower.includes('audit') ||
      lower.includes('ledger') ||
      lower.includes('recovery')
    ) {
      agentResponse = "AI Revenue Recovery protects recurring revenue through autonomous multi-rail routing, two-way WhatsApp recovery links, and cryptographic SHA-256 audit trails. How can I assist you with your transaction today?";
    }
    // 5. Strict Out-of-Scope Guardrail
    else if (
      lower.includes('weather') ||
      lower.includes('code') ||
      lower.includes('programming') ||
      lower.includes('poem') ||
      lower.includes('joke') ||
      lower.includes('stock') ||
      lower.includes('crypto') ||
      lower.includes('movie') ||
      lower.includes('president')
    ) {
      agentResponse = "I can only help with questions regarding AI Revenue Recovery. How can I assist you with autonomous payment recovery or transaction retries today?";
    }
    // 6. Natural Conversational Fallback
    else {
      agentResponse = `I understand ${customerName}. We can trigger an instant switch to a secondary bank rail right now, or send a fast one-click recovery link to your phone. Which do you prefer?`;
    }

    res.json({
      success: true,
      data: {
        agentResponse,
        sessionStep: sessionStep + 1,
        isFinished,
        recovered,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
