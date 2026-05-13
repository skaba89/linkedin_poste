import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { randomBytes } from 'crypto';

// GET /api/webhooks — list webhook subscriptions for authenticated user
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const subscriptions = await db.webhookSubscription.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = subscriptions.map((sub) => ({
      ...sub,
      events: safeJsonParse(sub.events),
    }));

    return NextResponse.json({ webhooks: parsed });
  } catch (error) {
    console.error('Webhooks GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/webhooks — create a new webhook subscription
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, events } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    if (!url?.trim()) {
      return NextResponse.json({ error: 'L\'URL est requise' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url.trim());
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    const secret = randomBytes(32).toString('hex');
    const eventsJson = typeof events === 'string' ? events : JSON.stringify(events || ['*']);

    const webhook = await db.webhookSubscription.create({
      data: {
        userId: authUser.id,
        name: name.trim(),
        url: url.trim(),
        secret,
        events: eventsJson,
      },
    });

    return NextResponse.json(
      {
        ...webhook,
        events: safeJsonParse(webhook.events),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Webhooks POST error:', error);
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
