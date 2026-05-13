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
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {
      OR: [
        { userId: authUser.id },
        { isPublic: true },
      ],
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { userId: authUser.id, name: { contains: search } },
        { userId: authUser.id, description: { contains: search } },
        { isPublic: true, name: { contains: search } },
        { isPublic: true, description: { contains: search } },
      ];
    }

    const templates = await db.postTemplate.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des templates' }, { status: 500 });
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
    const { name, description, category, structure, example, tags, isPublic } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }
    if (!structure?.trim()) {
      return NextResponse.json({ error: 'La structure est requise' }, { status: 400 });
    }

    const template = await db.postTemplate.create({
      data: {
        userId: authUser.id,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || 'general',
        structure: structure.trim(),
        example: example?.trim() || null,
        tags: tags ? JSON.stringify(tags) : null,
        isPublic: isPublic || false,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du template' }, { status: 500 });
  }
}
