import { db } from '../config/db.js';
import { AuditLogDoc } from '../models/types.js';

export async function logAuditEvent(params: {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  batchId?: string;
  semesterNumber?: number;
  metadata?: Record<string, any>;
}): Promise<AuditLogDoc> {
  const auditDoc = await db.AuditLogs.create({
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    batchId: params.batchId,
    semesterNumber: params.semesterNumber,
    metadata: params.metadata || {},
    timestamp: new Date().toISOString(),
  });

  return auditDoc as AuditLogDoc;
}
