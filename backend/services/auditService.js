import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import { RecoveryCase } from '../models/RecoveryCase.js';
import { isDbConnected } from '../config/db.js';

export const GENESIS_HASH = '00000000000000000000000000000000';

// In-memory store for high-performance offline resilience
export const inMemoryAuditLogs = [];

let ioInstance = null;

export const setAuditSocket = (io) => {
  ioInstance = io;
};

/**
 * Computes deterministic SHA-256 hash over chained audit ledger components
 * Formula: SHA-256(${previousHash}|${timestamp}|${agentName}|${actionTaken}|${JSON.stringify(payload)})
 */
export const computeAuditHash = ({ previousHash, timestamp, agentName, actionTaken, payload }) => {
  const tsString =
    timestamp instanceof Date
      ? timestamp.toISOString()
      : typeof timestamp === 'string'
      ? timestamp
      : new Date(timestamp).toISOString();

  const payloadString = JSON.stringify(payload ?? {});
  const rawData = `${previousHash}|${tsString}|${agentName}|${actionTaken}|${payloadString}`;

  return crypto.createHash('sha256').update(rawData).digest('hex');
};

/**
 * Creates an immutable, cryptographically chained audit log entry for a recovery case.
 * Links to the previous audit log hash or uses GENESIS_HASH if first entry.
 */
export const createChainedAuditLog = async ({
  caseId,
  caseNumber,
  agentName,
  actionTaken,
  payload = {},
}) => {
  // Normalize caseNumber & caseId
  let resolvedCaseNumber = caseNumber;
  let resolvedCaseObjectId = null;

  if (caseId) {
    if (mongoose.Types.ObjectId.isValid(caseId) && String(caseId).length === 24) {
      resolvedCaseObjectId = new mongoose.Types.ObjectId(caseId);
    } else if (typeof caseId === 'string' && !resolvedCaseNumber) {
      resolvedCaseNumber = caseId;
    }
  }

  // Attempt to resolve ObjectId / caseNumber from DB if available
  if (isDbConnected && (!resolvedCaseObjectId || !resolvedCaseNumber)) {
    try {
      const existingCase = await RecoveryCase.findOne({
        $or: [
          ...(resolvedCaseObjectId ? [{ _id: resolvedCaseObjectId }] : []),
          ...(resolvedCaseNumber ? [{ caseId: resolvedCaseNumber }, { caseNumber: resolvedCaseNumber }] : []),
        ],
      });
      if (existingCase) {
        resolvedCaseObjectId = existingCase._id;
        resolvedCaseNumber = existingCase.caseNumber || existingCase.caseId;
      }
    } catch (err) {
      // Continue gracefully
    }
  }

  if (!resolvedCaseNumber) {
    resolvedCaseNumber = resolvedCaseObjectId ? String(resolvedCaseObjectId) : `RCV-${Date.now()}`;
  }

  // 1. Fetch the most recent audit entry for this case to extract its hash
  let previousHash = GENESIS_HASH;

  if (isDbConnected) {
    try {
      const lastLog = await AuditLog.findOne({
        $or: [
          ...(resolvedCaseObjectId ? [{ caseId: resolvedCaseObjectId }] : []),
          { caseNumber: resolvedCaseNumber },
        ],
      }).sort({ createdAt: -1, _id: -1 });

      if (lastLog && lastLog.hash) {
        previousHash = lastLog.hash;
      }
    } catch (err) {
      console.warn('[AuditService] Failed to query last DB log:', err.message);
    }
  } else {
    // Check in-memory store (newest entry is at index 0 due to unshift)
    const lastMemoryLog = inMemoryAuditLogs.find(
      (l) =>
        l.caseNumber === resolvedCaseNumber ||
        (resolvedCaseObjectId && String(l.caseId) === String(resolvedCaseObjectId))
    );

    if (lastMemoryLog && lastMemoryLog.hash) {
      previousHash = lastMemoryLog.hash;
    }
  }

  // 2. Prepare timestamp and compute SHA-256 hash
  const timestamp = new Date();
  const hash = computeAuditHash({
    previousHash,
    timestamp,
    agentName,
    actionTaken,
    payload,
  });

  const auditEntry = {
    caseId: resolvedCaseObjectId,
    caseNumber: resolvedCaseNumber,
    timestamp,
    agentName,
    actionTaken,
    payload,
    previousHash,
    hash,
    createdAt: timestamp,
  };

  // 3. Persist entry
  inMemoryAuditLogs.unshift(auditEntry);
  if (inMemoryAuditLogs.length > 500) inMemoryAuditLogs.pop();

  let savedDoc = auditEntry;
  if (isDbConnected) {
    try {
      savedDoc = await AuditLog.create(auditEntry);
    } catch (err) {
      console.error('[AuditService] DB creation error:', err.message);
    }
  }

  // 4. Broadcast live telemetry event via Socket.IO
  if (ioInstance) {
    ioInstance.emit('terminal:log', {
      id: `AUD-${Date.now()}`,
      timestamp: timestamp.toLocaleTimeString(),
      type: 'audit',
      action: actionTaken,
      caseId: resolvedCaseNumber,
      actor: agentName,
      checksum: hash.slice(0, 12),
      fullHash: hash,
      previousHash: previousHash.slice(0, 12),
      message: payload?.message || `[${actionTaken}] recorded on ${resolvedCaseNumber}`,
      details: payload,
    });
  }

  return savedDoc;
};

/**
 * Cryptographically verifies the audit log chain integrity for a specific case.
 * Traverses from Genesis hash, recomputing each block's SHA-256 hash and verifying links.
 * Returns true if unbroken, false otherwise.
 */
export const verifyChainIntegrity = async (caseIdentifier) => {
  if (!caseIdentifier) return false;

  let query = {};
  if (mongoose.Types.ObjectId.isValid(caseIdentifier) && String(caseIdentifier).length === 24) {
    query = {
      $or: [
        { caseId: new mongoose.Types.ObjectId(caseIdentifier) },
        { caseNumber: String(caseIdentifier) },
      ],
    };
  } else {
    query = { caseNumber: String(caseIdentifier) };
  }

  let logs = [];
  if (isDbConnected) {
    try {
      logs = await AuditLog.find(query).sort({ timestamp: 1, createdAt: 1, _id: 1 });
    } catch (err) {
      console.warn('[AuditService] DB chain fetch error, checking in-memory:', err.message);
    }
  }

  // Fallback to in-memory logs if DB returned empty
  if (!logs || logs.length === 0) {
    logs = inMemoryAuditLogs
      .filter((l) => {
        if (l.caseNumber === String(caseIdentifier)) return true;
        if (l.caseId && String(l.caseId) === String(caseIdentifier)) return true;
        return false;
      })
      .slice()
      .reverse(); // in-memory is unshifted, so reverse to chronological order
  }

  // An empty chain has no breaks
  if (logs.length === 0) {
    return true;
  }

  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    // 1. Verify previous hash pointer
    if (entry.previousHash !== expectedPreviousHash) {
      console.warn(
        `[Audit Integrity Breach] Entry #${i} (${entry.actionTaken}) previousHash mismatch. Expected ${expectedPreviousHash}, found ${entry.previousHash}`
      );
      return false;
    }

    // 2. Recompute and verify current hash
    const recalculatedHash = computeAuditHash({
      previousHash: entry.previousHash,
      timestamp: entry.timestamp,
      agentName: entry.agentName,
      actionTaken: entry.actionTaken,
      payload: entry.payload,
    });

    if (recalculatedHash !== entry.hash) {
      console.warn(
        `[Audit Integrity Breach] Entry #${i} hash corrupted. Recalculated ${recalculatedHash}, recorded ${entry.hash}`
      );
      return false;
    }

    expectedPreviousHash = entry.hash;
  }

  return true;
};

/**
 * Universal adapter for backward compatibility across existing controllers
 */
export class AuditService {
  static async record({
    caseId,
    caseNumber,
    action,
    actionTaken,
    actor,
    agentName,
    details = {},
    payload,
  }) {
    return createChainedAuditLog({
      caseId,
      caseNumber: caseNumber || caseId,
      agentName: agentName || actor || 'SYSTEM_AI_ENGINE',
      actionTaken: actionTaken || action || 'TRANSACTION_EVENT',
      payload: payload || details,
    });
  }

  static async verifyChainIntegrity(caseId) {
    return verifyChainIntegrity(caseId);
  }

  static getRecentLogs(limit = 50) {
    return inMemoryAuditLogs.slice(0, limit);
  }
}

export default AuditService;
