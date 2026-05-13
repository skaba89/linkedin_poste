import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Verify ownership
    const newsletter = await db.newsletter.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 });
    }

    const where: Record<string, unknown> = { newsletterId: id };
    if (status && status !== 'all') {
      where.status = status;
    }

    const posts = await db.newsletterPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Newsletter posts list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, excerpt, postId } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return NextResponse.json(
        { error: 'Le titre est requis (min. 2 caractères)' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Le contenu est requis (min. 10 caractères)' },
        { status: 400 }
      );
    }

    // Verify ownership
    const newsletter = await db.newsletter.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 });
    }

    const post = await db.newsletterPost.create({
      data: {
        newsletterId: id,
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt?.trim() || null,
        postId: postId || null,
        status: 'draft',
      },
    });

    await createAuditLog({
      entityType: 'NewsletterPost',
      entityId: post.id,
      action: 'create',
      userId: authUser.id,
      metadata: { newsletterId: id, title: post.title },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Newsletter post create error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
