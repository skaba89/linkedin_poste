import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

const VALID_CHANNELS = ['linkedin', 'email', 'twitter'];
const VALID_DIRECTIONS = ['outbound', 'inbound'];
const VALID_STATUSES = ['draft', 'sent', 'delivered', 'opened', 'replied', 'failed'];

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const prospectId = searchParams.get('prospectId');

    if (!prospectId) {
      return NextResponse.json({ error: 'prospectId requis' }, { status: 400 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `outreach:list:${authUser.id}`);
    if (rlResult) return rlResult;

    // Verify ownership
    const prospect = await db.prospect.findFirst({
      where: { id: prospectId, userId: authUser.id },
    });
    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    const messages = await db.outreachMessage.findMany({
      where: { prospectId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Outreach GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlCreate = await rateLimitMiddleware(apiLimiter, request, `outreach:create:${authUser.id}`);
    if (rlCreate) return rlCreate;

    const body = await request.json();
    const { prospectId, channel, direction, subject, content, status } = body;

    if (!prospectId || !content?.trim()) {
      return NextResponse.json({ error: 'prospectId et content requis' }, { status: 400 });
    }

    if (channel && !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json({ error: 'Canal invalide' }, { status: 400 });
    }
    if (direction && !VALID_DIRECTIONS.includes(direction)) {
      return NextResponse.json({ error: 'Direction invalide' }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    // Verify ownership
    const prospect = await db.prospect.findFirst({
      where: { id: prospectId, userId: authUser.id },
    });
    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    const now = new Date();
    const message = await db.outreachMessage.create({
      data: {
        prospectId,
        channel: channel || 'linkedin',
        direction: direction || 'outbound',
        subject: subject?.trim() || null,
        content: content.trim(),
        status: status || 'sent',
        sentAt: (status === 'sent' || !status) ? now : null,
      },
    });

    // Update prospect lastContactedAt
    if (direction !== 'inbound' || status === 'sent') {
      await db.prospect.update({
        where: { id: prospectId },
        data: { lastContactedAt: now },
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Outreach POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
