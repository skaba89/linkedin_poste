import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const format = searchParams.get('format') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const status = searchParams.get('status') || undefined;

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'fromDate et toDate requis' }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId: authUser.id };
    where.plannedDate = {
      gte: startOfDay(parseISO(fromDate)),
      lte: endOfDay(parseISO(toDate)),
    };
    if (format) where.format = format;
    if (priority) where.priority = priority;
    if (status) where.status = status;

    const items = await db.contentPlanItem.findMany({
      where,
      orderBy: [{ plannedDate: 'asc' }, { plannedTime: 'asc' }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const {
      plannedDate,
      plannedTime,
      topic,
      format,
      audience,
      priority,
      status,
      suggestedHashtags,
      aiSuggestion,
      notes,
      postId,
    } = body;

    if (!plannedDate || !topic) {
      return NextResponse.json({ error: 'plannedDate et topic requis' }, { status: 400 });
    }

    const item = await db.contentPlanItem.create({
      data: {
        userId: authUser.id,
        plannedDate: new Date(plannedDate),
        plannedTime: plannedTime || null,
        topic,
        format: format || 'text',
        audience: audience || null,
        priority: priority || 'medium',
        status: status || 'planned',
        suggestedHashtags: suggestedHashtags || null,
        aiSuggestion: aiSuggestion || null,
        notes: notes || null,
        postId: postId || null,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
