import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { prompt: { contains: search } },
      ];
    }

    const [templates, total] = await Promise.all([
      db.promptTemplate.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.promptTemplate.count({ where }),
    ]);

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Prompts GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, prompt, variables, isDefault } = body;

    if (!name || !prompt) {
      return NextResponse.json({ error: 'Le nom et le prompt sont requis' }, { status: 400 });
    }

    const template = await db.promptTemplate.create({
      data: {
        name,
        description: description || null,
        category: category || 'general',
        prompt,
        variables: variables ? JSON.stringify(variables) : null,
        isDefault: isDefault || false,
        authorId: authUser.id,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Prompts POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
