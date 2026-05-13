import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// GET /api/notification-channels — list channels for authenticated user
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const channels = await db.notificationChannel.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    });

    // Parse config and events from JSON strings to objects
    const parsed = channels.map((ch) => ({
      ...ch,
      config: safeJsonParse(ch.config),
      events: safeJsonParse(ch.events),
    }));

    return NextResponse.json({ channels: parsed });
  } catch (error) {
    console.error('Notification channels fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/notification-channels — create a new channel
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { channel, label, config, events, isEnabled } = body;

    if (!channel || !['email', 'telegram', 'whatsapp'].includes(channel)) {
      return NextResponse.json({ error: 'Type de canal invalide' }, { status: 400 });
    }

    const newChannel = await db.notificationChannel.create({
      data: {
        userId: authUser.id,
        channel,
        label: label || '',
        config: typeof config === 'string' ? config : JSON.stringify(config || {}),
        events: typeof events === 'string' ? events : JSON.stringify(events || ['*']),
        isEnabled: isEnabled !== false,
      },
    });

    return NextResponse.json(
      {
        ...newChannel,
        config: safeJsonParse(newChannel.config),
        events: safeJsonParse(newChannel.events),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Notification channel create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Helper
function safeJsonParse(str: string | null | undefined): unknown {
  if (!str) return str;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
