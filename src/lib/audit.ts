import { db } from '@/lib/db';

interface AuditOptions {
  entityType: string;
  entityId?: string;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(options: AuditOptions): Promise<void> {
  await db.auditLog.create({
    data: {
      entityType: options.entityType,
      entityId: options.entityId,
      action: options.action,
      userId: options.userId,
      metadata: options.metadata ? JSON.stringify(options.metadata) : null,
    },
  });
}

export async function getAuditLogs(limit = 50, offset = 0) {
  return db.auditLog.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
