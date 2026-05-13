import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// GET /api/webhooks/[id] — get single webhook subscription
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
    const webhook = await db.webhookSubscription.findUnique({
      where: { id },
    });

    if (!webhook || webhook.userId !== authUser.id) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      ...webhook,
      events: safeJsonParse(webhook.events),
    });
  } catch (error) {
    console.error('Webhook GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/webhooks/[id] — update webhook subscription
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.webhookSubscription.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    const body = await request.json();
    const { name, url, events, isActive } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (url !== undefined) {
      if (!url?.trim()) {
        return NextResponse.json({ error: 'L\'URL est requise' }, { status: 400 });
      }
      try {
        new URL(url.trim());
      } catch {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
      }
      updateData.url = url.trim();
    }

    if (events !== undefined) {
      updateData.events = typeof events === 'string' ? events : JSON.stringify(events);
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await db.webhookSubscription.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updated,
      events: safeJsonParse(updated.events),
    });
  } catch (error) {
    console.error('Webhook PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/webhooks/[id] — delete webhook subscription
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
    const existing = await db.webhookSubscription.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== authUser.id) {
      return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 });
    }

    await db.webhookSubscription.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook DELETE error:', error);
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
