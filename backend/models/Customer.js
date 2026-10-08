import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    phone: {
      type: String,
      default: '',
    },
    company: {
      type: String,
      default: '',
    },
    tier: {
      type: String,
      enum: ['Enterprise', 'Scale', 'Growth', 'SMB'],
      default: 'Growth',
    },
    mrr: {
      type: Number,
      default: 0,
    },
    lifetimeValue: {
      type: Number,
      default: 0,
    },
    preferredChannel: {
      type: String,
      enum: ['email', 'whatsapp', 'phone', 'automated_retry'],
      default: 'automated_retry',
    },
    paymentMethods: [
      {
        methodId: String,
        type: { type: String, default: 'card' },
        brand: String,
        last4: String,
        expMonth: Number,
        expYear: Number,
        isDefault: Boolean,
      },
    ],
    riskRating: {
      type: String,
      enum: ['LOW', 'MODERATE', 'ELEVATED', 'CRITICAL'],
      default: 'LOW',
    },
  },
  {
    timestamps: true,
  }
);

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
