import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// GET /api/content/recycling-rules — list recycling rules
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rules = await db.contentRecyclingRule.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Recycling rules list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/content/recycling-rules — create a recycling rule
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, minDaysOld, minScore, maxRecycles, autoRecycle, frequency, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const rule = await db.contentRecyclingRule.create({
      data: {
        userId: authUser.id,
        name,
        description: description || null,
        minDaysOld: minDaysOld ?? 30,
        minScore: minScore ?? 70,
        maxRecycles: maxRecycles ?? 3,
        autoRecycle: autoRecycle ?? false,
        frequency: frequency || 'monthly',
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Recycling rule create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
