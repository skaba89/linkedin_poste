import { db } from '@/lib/db';

export async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl,
  metadata
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}) {
  return db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
