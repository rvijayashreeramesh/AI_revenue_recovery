import mongoose from 'mongoose';

const recoveryCaseSchema = new mongoose.Schema(
  {
    // Unique formatted string (e.g., "RCV-88214")
    caseId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `RCV-${Math.floor(10000 + Math.random() * 90000)}`,
    },
    caseNumber: {
      type: String,
      index: true,
    },
    // Customer Profile
    customer: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String, default: '' },
      email: { type: String, required: true },
      vpa: { type: String, default: '' }, // e.g. "rohit.verma@okhdfcbank"
      previousSuccessCount: { type: Number, default: 0 },
      ltv: { type: Number, default: 0 },
    },
    // Transaction Details
    transaction: {
      amount: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      paymentMethod: {
        type: String,
        enum: ['UPI', 'CARD', 'NETBANKING', 'INVOICE'],
        default: 'UPI',
      },
      errorCode: { type: String, default: 'BAD_REQUEST_ERROR' },
      errorDescription: { type: String, default: 'Payment failed at issuing bank' },
      gateway: { type: String, default: 'RAZORPAY_MOCK' },
    },
    // Category of failure
    category: {
      type: String,
      enum: ['FAILED_PAYMENT', 'ABANDONED_CHECKOUT', 'SUBSCRIPTION_FAILURE', 'OVERDUE_INVOICE'],
      default: 'FAILED_PAYMENT',
      index: true,
    },
    // Lifecycle Status
    status: {
      type: String,
      enum: [
        'DETECTED',
        'DIAGNOSING',
        'SCHEDULED',
        'AWAITING_HUMAN',
        'ACTION_PENDING',
        'AWAITING_CUSTOMER',
        'ACTION_REQUIRED',
        'RECOVERED',
        'FAILED',
      ],
      default: 'DETECTED',
      index: true,
    },
    // WhatsApp Recovery Tracking
    whatsappMessageId: {
      type: String,
      default: '',
    },
    whatsappStatus: {
      type: String,
      enum: ['NOT_SENT', 'DISPATCHED', 'DELIVERED', 'REPLIED_PAY', 'REPLIED_DISCOUNT', 'FAILED'],
      default: 'NOT_SENT',
    },
    whatsappThread: {
      outboundMessageId: { type: String, default: '' },
      outboundTimestamp: { type: Date },
      inboundReplyText: { type: String, default: '' },
      inboundTimestamp: { type: Date },
      deliveryStatus: {
        type: String,
        enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'REPLIED'],
        default: 'PENDING',
      },
    },
    // AI Diagnosis & Reasoning Engine
    aiDiagnosis: {
      rootCause: { type: String, default: 'Pending diagnostic inference...' },
      recoveryProbability: { type: Number, min: 0, max: 1, default: 0.75 },
      confidenceScore: { type: Number, min: 0, max: 1, default: 0.88 },
      recommendedAction: {
        type: String,
        enum: ['SMART_RETRY', 'UPI_SWITCH', 'WHATSAPP_LINK', 'DISCOUNT_OFFER', 'VOICE_CALL', 'HUMAN_ESCALATE'],
        default: 'SMART_RETRY',
      },
      reasoning: [{ type: String }],
    },
    // Retry Orchestration
    retrySchedule: {
      attemptCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 },
      nextRetryAt: { type: Date },
    },
    // Max 10% discount concession allowed
    discountApplied: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    // Recovery timestamp upon settlement
    recoveredAt: {
      type: Date,
    },
    // Audit timeline ledger
    timeline: [
      {
        timestamp: { type: Date, default: Date.now },
        event: { type: String, required: true },
        type: { type: String, default: 'info' },
        actor: { type: String, default: 'Autonomous Recovery Engine' },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Synchronize caseNumber and caseId on save
recoveryCaseSchema.pre('save', function (next) {
  if (!this.caseNumber && this.caseId) {
    this.caseNumber = this.caseId;
  }
  if (!this.caseId && this.caseNumber) {
    this.caseId = this.caseNumber;
  }
  next();
});

// Virtual accessors for seamless template & controller interoperability
recoveryCaseSchema.virtual('amount').get(function () {
  return this.transaction?.amount;
});

recoveryCaseSchema.virtual('currency').get(function () {
  return this.transaction?.currency || 'INR';
});

recoveryCaseSchema.virtual('gateway').get(function () {
  return this.transaction?.gateway || 'RAZORPAY_MOCK';
});

recoveryCaseSchema.virtual('failureCode').get(function () {
  return this.transaction?.errorCode;
});

recoveryCaseSchema.virtual('failureReason').get(function () {
  return this.transaction?.errorDescription;
});

export const RecoveryCase =
  mongoose.models.RecoveryCase || mongoose.model('RecoveryCase', recoveryCaseSchema);

export default RecoveryCase;
