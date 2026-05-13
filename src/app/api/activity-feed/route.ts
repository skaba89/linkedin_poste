import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

interface FeedItem {
  id: string;
  type: 'agent' | 'audit' | 'post' | 'notification';
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  userName?: string | null;
  createdAt: Date;
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || '';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // Determine user IDs to include (user + workspace members)
    let userIds: string[] = [authUser.id];

    if (workspaceId) {
      // Verify the user is a member of this workspace
      const membership = await db.workspaceMember.findFirst({
        where: {
          workspaceId: workspaceId,
          userId: authUser.id,
        },
      });

      if (membership) {
        const members = await db.workspaceMember.findMany({
          where: { workspaceId: workspaceId },
          select: { userId: true },
        });
        userIds = members.map((m) => m.userId);
      }
    }

    // Fetch all activity types in parallel
    const [agentActivities, auditLogs, recentPosts, recentNotifications] = await Promise.all([
      // Agent Activities
      db.agentActivity.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
      // Audit Logs
      db.auditLog.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      // Recent Posts (created or published)
      db.post.findMany({
        where: {
          authorId: { in: userIds },
          status: { in: ['posted', 'approved', 'scheduled'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
      }),
      // Recent Notifications (unread or recent)
      db.notification.findMany({
        where: {
          userId: { in: userIds },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    // Normalize all items into a unified feed format
    const feedItems: FeedItem[] = [];

    // Agent Activities
    for (const activity of agentActivities) {
      feedItems.push({
        id: activity.id,
        type: 'agent',
        title: activity.title,
        description: activity.description,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        userName: activity.user?.name || null,
        createdAt: activity.createdAt,
      });
    }

    // Audit Logs
    for (const log of auditLogs) {
      let description = log.action;
      if (log.metadata) {
        try {
          const meta = JSON.parse(log.metadata);
          description = `${log.action} - ${log.entityType}${log.entityId ? ` (${log.entityId.slice(0, 8)}...)` : ''}`;
        } catch {
          description = `${log.action} - ${log.entityType}`;
        }
      }
      feedItems.push({
        id: log.id,
        type: 'audit',
        title: log.entityType,
        description,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        userName: log.user?.name || null,
        createdAt: log.createdAt,
      });
    }

    // Recent Posts
    for (const post of recentPosts) {
      const statusLabels: Record<string, string> = {
        posted: 'Publié',
        approved: 'Approuvé',
        scheduled: 'Programmé',
      };
      feedItems.push({
        id: post.id,
        type: 'post',
        title: post.subject || 'Post sans titre',
        description: `Post ${statusLabels[post.status] || post.status}${post.contentScore ? ` — Score: ${post.contentScore}/100` : ''}`,
        metadata: {
          status: post.status,
          contentScore: post.contentScore,
        },
        userName: post.author?.name || null,
        createdAt: post.createdAt,
      });
    }

    // Recent Notifications
    for (const notification of recentNotifications) {
      feedItems.push({
        id: notification.id,
        type: 'notification',
        title: notification.title,
        description: notification.message,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
        userName: null,
        createdAt: notification.createdAt,
      });
    }

    // Sort all items by createdAt desc and limit
    feedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limitedItems = feedItems.slice(0, limit);

    return NextResponse.json({
      items: limitedItems.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      total: feedItems.length,
      workspaceId: workspaceId || null,
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
