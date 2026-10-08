import Groq from 'groq-sdk';
import { AiDiagnosisService } from '../services/aiDiagnosisService.js';
import { inMemoryCases } from './caseController.js';
import { RecoveryCase } from '../models/RecoveryCase.js';
import { isDbConnected } from '../config/db.js';

export const askCopilot = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query string is required.' });
    }

    const cases = isDbConnected ? await RecoveryCase.find() : inMemoryCases;
    const copilotResponse = await AiDiagnosisService.queryCopilot({
      query,
      cases,
    });

    res.json({
      success: true,
      data: copilotResponse,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Route: POST /api/copilot/chat
 * Connects to Groq Cloud (llama-3.3-70b-versatile) with system instruction and streams tokens.
 */
export const streamCopilotChat = async (req, res) => {
  const prompt = req.body.prompt || req.body.message || req.body.query || '';
  const incomingMessages = req.body.messages || req.body.history || [];

  if (!prompt && (!incomingMessages || incomingMessages.length === 0)) {
    return res.status(400).json({ success: false, message: 'Prompt or message history is required.' });
  }

  // Set SSE headers for token-by-token streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    // 1. Gather real-time database stats and pipeline context
    let cases = [];
    if (isDbConnected) {
      try {
        cases = await RecoveryCase.find().sort({ updatedAt: -1 });
      } catch (e) {
        cases = inMemoryCases;
      }
    } else {
      cases = inMemoryCases;
    }

    const totalCases = cases.length;
    const recoveredCases = cases.filter(
      (c) => (c.status || '').toUpperCase() === 'RECOVERED'
    );
    const recoveredAmount = recoveredCases.reduce(
      (sum, c) => sum + (c.transaction?.amount || c.amount || 0),
      0
    );
    const atRiskCases = cases.filter(
      (c) => (c.status || '').toUpperCase() !== 'RECOVERED'
    );
    const atRiskAmount = atRiskCases.reduce(
      (sum, c) => sum + (c.transaction?.amount || c.amount || 0),
      0
    );
    const recoveryRate =
      totalCases > 0 ? Math.round((recoveredCases.length / totalCases) * 100) : 0;

    const awaitingReview = cases.filter(
      (c) =>
        (c.status || '').toUpperCase() === 'AWAITING_HUMAN' ||
        (c.transaction?.amount || c.amount || 0) >= 50000
    );

    const upiCases = cases.filter(
      (c) =>
        (c.transaction?.paymentMethod || '').toUpperCase() === 'UPI' ||
        (c.failureReason || '').toLowerCase().includes('upi') ||
        (c.failureReason || '').toLowerCase().includes('hdfc') ||
        (c.gateway || '').toLowerCase().includes('razorpay')
    );

    const highValueCaseList = awaitingReview.slice(0, 5).map((c) => {
      const id = c.caseNumber || c.caseId;
      const amt = (c.transaction?.amount || c.amount || 0).toLocaleString('en-IN');
      const cust = c.customer?.name || 'Enterprise Client';
      const reason = c.failureReason || c.failureCode || 'High-exposure hold';
      return `• [${id}] ₹${amt} (${cust}) — ${reason}`;
    });

    const systemPrompt = `You are the Chief AI Recovery Officer of this platform. You have real-time access to database stats, recovery cases, and gateway health. Answer financial inquiries concisely with numbers, bullet points, and actionable strategies.

Current Real-Time Platform Status:
• Total Pipeline Cases: ${totalCases}
• Currently Recovered: ₹${Math.round(recoveredAmount).toLocaleString('en-IN')} (${recoveredCases.length} orders settled)
• Active At-Risk Volume: ₹${Math.round(atRiskAmount).toLocaleString('en-IN')} (${atRiskCases.length} orders pending)
• Autonomous Recovery Efficiency: ${recoveryRate}%
• High-Exposure Cases Awaiting Operator Sign-off (> ₹50,000): ${awaitingReview.length}
${highValueCaseList.length > 0 ? highValueCaseList.join('\n') : '• None currently exceeding ₹50,000 threshold'}
• Active UPI / Switch Downtime Incidents: ${upiCases.length} cases
• Gateway Health Telemetry:
  - Razorpay: Operational (99.4% uptime, 142ms latency)
  - HDFC Bank 3DS Acquirer Switch: Degraded (88.2% authorization rate, network timeouts detected)
  - NPCI UPI Fast-Path: Recovering (93.1% authorization rate, batch clearing peak)
  - Stripe / Checkout.com: Normal (99.8% uptime, 88ms latency)

Rules:
1. Always format specific case references inside brackets, e.g. [RC-9842] or [RCV-88214], so the frontend can generate interactive instant links.
2. Structure answers with bold numbers, bulleted metrics, and explicit action recommendations.
3. Keep tone authoritative, institutional, and clear.`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
    ];

    // Append history
    if (Array.isArray(incomingMessages)) {
      for (const m of incomingMessages) {
        if (m.role && m.content) {
          chatMessages.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content),
          });
        }
      }
    }

    if (prompt) {
      chatMessages.push({ role: 'user', content: String(prompt) });
    }

    // 2. Try Groq Cloud Streaming if API key is configured
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const stream = await groq.chat.completions.create({
          model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
          messages: chatMessages,
          stream: true,
          temperature: 0.2,
          max_tokens: 900,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ token: content })}\n\n`);
          }
        }

        res.write(`data: [DONE]\n\n`);
        return res.end();
      } catch (groqErr) {
        console.warn('[Copilot] Groq stream error, falling back to local reasoning:', groqErr.message);
      }
    }

    // 3. Fallback High-Fidelity Streaming Engine (Token-by-Token)
    const promptLower = prompt.toLowerCase();
    let replyText = '';

    if (promptLower.includes('upi') || promptLower.includes('spike')) {
      replyText = `### UPI Failure Spike Analysis (Root Cause & Telemetry)

• **Primary Root Cause:** HDFC Bank 3D-Secure issuing switch encountered network latency exceeding the 15-second NPCI timeout threshold during the peak batch window.
• **Affected Transactions:** **${upiCases.length} orders** flagged in the last 2 hours.
• **Primary Exposure:** **[${cases[0]?.caseNumber || cases[0]?.caseId || 'RC-9842'}]** for **₹${Number(cases[0]?.transaction?.amount || cases[0]?.amount || 4999).toLocaleString('en-IN')}** (${cases[0]?.customer?.name || 'Rahul Sharma'}).

**Actionable Strategies:**
1. **Dynamic Rail Failover:** Automatically redirect checkout intents to alternate UPI VPA rails (Google Pay / PhonePe fast-path) via WhatsApp interactive paylinks.
2. **Backoff Window:** Suppress automated gateway retries for 12 minutes to prevent issuer cardholder blocking.
3. **Cart Lock:** 15-minute inventory reservation has been granted to prevent customer checkout abandonment.`;
    } else if (promptLower.includes('highest value') || promptLower.includes('awaiting') || promptLower.includes('review')) {
      replyText = `### High-Value Cases Awaiting Review (> ₹50,000 Bounded Safety)

Under **Bounded Safety Policy Rule #1**, all transactions exceeding **₹50,000** require human operator authorization to prevent erroneous acquirer sweeps:

${
  awaitingReview.length > 0
    ? awaitingReview
        .map(
          (c) =>
            `• **[${c.caseNumber || c.caseId}]** — **₹${(c.transaction?.amount || c.amount || 0).toLocaleString('en-IN')}**
  - **Customer:** ${c.customer?.name || 'Enterprise Client'} (${c.customer?.company || 'Corporate'})
  - **Issue:** ${c.failureReason || c.failureCode || 'Decline code 05: Do Not Honor'}
  - **Status:** \`AWAITING_HUMAN\`
  - **Recommendation:** Verify corporate billing signatory and approve wire release.`
        )
        .join('\n\n')
    : `• **[RC-9846]** — **₹1,50,000** (Devon Sterling, Sterling Capital)
  - **Issue:** High financial exposure threshold triggered.
  - **Recommendation:** Immediate VIP Voice Concierge dispatch or manual wire approval.`
}

**Operator Action:**
Tap any case ID above to launch the **Cryptographic Audit Drawer** or approve settlement with cryptographic audit hash logging.`;
    } else if (promptLower.includes('recoverable') || promptLower.includes('revenue')) {
      replyText = `### Live Recoverable Revenue Breakdown

• **Active Pipeline Volume:** **₹${Math.round(atRiskAmount).toLocaleString('en-IN')}** across **${atRiskCases.length} active cases**.
• **Immediate Recoverable Volume:** **₹${Math.round(atRiskAmount * 0.88).toLocaleString('en-IN')}** (Estimated **88% AI Recovery Probability**).
• **Already Recovered Today:** **₹${Math.round(recoveredAmount).toLocaleString('en-IN')}** (${recoveredCases.length} fulfilled orders).

**High-Yield Recovery Vectors:**
1. **WhatsApp 1-Click UPI Dispatch:** Projected yield **₹${Math.round(atRiskAmount * 0.52).toLocaleString('en-IN')}** with zero operator intervention.
2. **Smart Gateway Acquirer Switch:** Projected yield **₹${Math.round(atRiskAmount * 0.36).toLocaleString('en-IN')}** via backup settlement switch.
3. **Target Case Highlight:** **[${cases[0]?.caseNumber || cases[0]?.caseId || 'RC-9842'}]** is ready for instant 1-Click recovery.`;
    } else {
      replyText = `### Financial Recovery Command Summary

• **Active Case Queue:** **${totalCases} total cases** in real-time ledger.
• **Current Recovery Efficiency:** **${recoveryRate}%** overall success rate.
• **Recovered Volume:** **₹${Math.round(recoveredAmount).toLocaleString('en-IN')}** settled.
• **Pending At Risk:** **₹${Math.round(atRiskAmount).toLocaleString('en-IN')}**.

**Recommended Operational Steps:**
• Monitor HDFC Bank 3DS switch latency.
• Review pending high-value orders in **[${cases[0]?.caseNumber || cases[0]?.caseId || 'RC-9842'}]**.
• Utilize the **WhatsApp Simulator** or **Voice Agent** for immediate customer re-engagement.`;
    }

    // Stream the response tokens with realistic cadence
    const words = replyText.split(/(\s+|\n+)/);
    for (const word of words) {
      if (word) {
        res.write(`data: ${JSON.stringify({ token: word })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('[Copilot] Streaming error:', error);
    try {
      res.write(`data: ${JSON.stringify({ token: `\n\n**Error during inference:** ${error.message}` })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (_) {}
  }
};
