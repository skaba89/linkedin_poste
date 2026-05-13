import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';

const VALID_PROVIDERS = ['openrouter', 'groq', 'glm', 'anthropic', 'openai'];

const VALID_TRANSITIONS: Record<string, string[]> = {
  'draft': ['pending_approval', 'approved', 'archived'],
  'pending_approval': ['approved', 'rejected', 'draft'],
  'rejected': ['draft', 'pending_approval', 'archived'],
  'approved': ['scheduled', 'posted', 'draft'],
  'scheduled': ['approved', 'posted', 'draft'],
  'posted': ['archived'],
  'archived': ['draft'],
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: urlId } = await params;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || urlId;

    if (!postId) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        aiVariants: { orderBy: { variantIndex: 'asc' } },
        validations: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        publicationLogs: { orderBy: { createdAt: 'desc' } },
        linkedinAccount: { select: { id: true, organizationName: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Post detail error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: urlId } = await params;
    const { searchParams } = new URL(request.url);
    const body = await request.json();

    // Accept postId from body, query string, or URL path (priority: body > query > path)
    const postId = body.postId || searchParams.get('postId') || urlId;

    if (!postId) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    const existing = await db.post.findUnique({ where: { id: postId } });
    if (!existing) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    if (!hasRole(authUser, 'admin') && existing.authorId !== authUser.id) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const updateData = body;
    const data: Record<string, unknown> = {};
    if (updateData.subject !== undefined) data.subject = updateData.subject;
    if (updateData.angle !== undefined) data.angle = updateData.angle;
    if (updateData.audience !== undefined) data.audience = updateData.audience;
    if (updateData.cta !== undefined) data.cta = updateData.cta;
    if (updateData.imageUrl !== undefined) data.imageUrl = updateData.imageUrl;
    if (updateData.hashtags !== undefined) data.hashtags = updateData.hashtags;
    if (updateData.scheduledDate !== undefined) data.scheduledDate = updateData.scheduledDate ? new Date(updateData.scheduledDate) : null;
    if (updateData.finalContent !== undefined) data.finalContent = updateData.finalContent;

    // Validate aiProvider
    if (updateData.aiProvider !== undefined) {
      if (!VALID_PROVIDERS.includes(updateData.aiProvider)) {
        return NextResponse.json({ error: 'Provider IA invalide' }, { status: 400 });
      }
      data.aiProvider = updateData.aiProvider;
    }

    // Validate status transition
    if (updateData.status !== undefined) {
      const allowedTransitions = VALID_TRANSITIONS[existing.status];
      if (!allowedTransitions || !allowedTransitions.includes(updateData.status)) {
        return NextResponse.json(
          { error: `Transition de statut invalide: ${existing.status} -> ${updateData.status}` },
          { status: 400 }
        );
      }
      data.status = updateData.status;
    }

    const post = await db.post.update({
      where: { id: postId },
      data,
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        aiVariants: { orderBy: { variantIndex: 'asc' } },
      },
    });

    await createAuditLog({
      entityType: 'Post',
      entityId: postId,
      action: 'update',
      userId: authUser.id,
      metadata: updateData,
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Post update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: urlId } = await params;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || urlId;

    if (!postId) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    const existing = await db.post.findUnique({ where: { id: postId } });
    if (!existing) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    if (!hasRole(authUser, 'admin') && existing.authorId !== authUser.id) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    if (existing.status === 'posted') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un post publié' },
        { status: 400 }
      );
    }

    await db.post.delete({ where: { id: postId } });

    await createAuditLog({
      entityType: 'Post',
      entityId: postId,
      action: 'delete',
      userId: authUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Post delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
