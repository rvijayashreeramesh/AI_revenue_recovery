import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'pending', 'refunded', 'disputed'],
      default: 'failed',
    },
    failureCode: {
      type: String,
      default: 'insufficient_funds',
    },
    failureMessage: {
      type: String,
      default: 'Card issuer declined the authorization request.',
    },
    gateway: {
      type: String,
      default: 'Stripe',
    },
    paymentMethodSummary: {
      type: String,
      default: 'Visa ending in 4242',
    },
    invoiceNumber: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
