import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// GET /api/notification-channels/[id] — get single channel
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const channel = await db.notificationChannel.findUnique({
      where: { id },
    });

    if (!channel || channel.userId !== authUser.id) {
      return NextResponse.json({ error: 'Canal non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      ...channel,
      config: safeJsonParse(channel.config),
      events: safeJsonParse(channel.events),
    });
  } catch (error) {
    console.error('Notification channel get error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/notification-channels/[id] — update channel
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.notificationChannel.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Canal non trouvé' }, { status: 404 });
    }

    const body = await request.json();
    const { channel, label, config, events, isEnabled } = body;

    const updateData: Record<string, unknown> = {};
    if (channel !== undefined) updateData.channel = channel;
    if (label !== undefined) updateData.label = label;
    if (config !== undefined) {
      updateData.config = typeof config === 'string' ? config : JSON.stringify(config);
    }
    if (events !== undefined) {
      updateData.events = typeof events === 'string' ? events : JSON.stringify(events);
    }
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const updated = await db.notificationChannel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      config: safeJsonParse(updated.config),
      events: safeJsonParse(updated.events),
    });
  } catch (error) {
    console.error('Notification channel update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/notification-channels/[id] — delete channel
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.notificationChannel.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Canal non trouvé' }, { status: 404 });
    }

    await db.notificationChannel.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification channel delete error:', error);
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
