import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId: authUser.id };
    if (status && status !== 'all') {
      where.status = status;
    }

    const newsletters = await db.newsletter.findMany({
      where,
      include: {
        _count: {
          select: { newsletterPosts: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error('Newsletters list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, frequency } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Le nom de la newsletter est requis (min. 2 caractères)' },
        { status: 400 }
      );
    }

    const validFrequencies = ['weekly', 'biweekly', 'monthly'];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Fréquence invalide. Valeurs acceptées : weekly, biweekly, monthly' },
        { status: 400 }
      );
    }

    const newsletter = await db.newsletter.create({
      data: {
        userId: authUser.id,
        name: name.trim(),
        description: description?.trim() || null,
        frequency: frequency || 'monthly',
        status: 'draft',
      },
    });

    await createAuditLog({
      entityType: 'Newsletter',
      entityId: newsletter.id,
      action: 'create',
      userId: authUser.id,
      metadata: { name: newsletter.name, frequency: newsletter.frequency },
    });

    return NextResponse.json({ newsletter }, { status: 201 });
  } catch (error) {
    console.error('Newsletter create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
