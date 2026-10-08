import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecoveryCase',
      required: false,
      index: true,
    },
    caseNumber: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    agentName: {
      type: String,
      required: true,
    },
    actionTaken: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    previousHash: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for frontend streaming terminal compatibility
auditLogSchema.virtual('action').get(function () {
  return this.actionTaken;
});

auditLogSchema.virtual('actor').get(function () {
  return this.agentName;
});

auditLogSchema.virtual('checksum').get(function () {
  return this.hash;
});

auditLogSchema.virtual('details').get(function () {
  return this.payload;
});

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
