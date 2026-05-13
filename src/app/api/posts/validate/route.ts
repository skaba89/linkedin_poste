import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'validator')) {
      return NextResponse.json(
        { error: 'Seuls les validateurs et admins peuvent valider' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { postId, action, comment } = body;

    if (!postId || !action) {
      return NextResponse.json(
        { error: 'Post ID et action requis' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      include: { author: { select: { id: true, name: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    // Create validation log
    const validation = await db.validationLog.create({
      data: {
        postId,
        userId: authUser.id,
        action,
        comment: comment || null,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Update post status based on action
    let newStatus: string;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'request_changes':
        newStatus = 'draft';
        break;
      default:
        newStatus = post.status;
    }

    const updatedPost = await db.post.update({
      where: { id: postId },
      data: { status: newStatus },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        validations: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await createAuditLog({
      entityType: 'Post',
      entityId: postId,
      action: `validate_${action}`,
      userId: authUser.id,
      metadata: { action, comment: comment || null },
    });

    // Send notification to post author
    if (post.authorId !== authUser.id) {
      if (action === 'approve') {
        await createNotification({
          userId: post.authorId,
          type: 'post_approved',
          title: 'Post approuvé',
          message: `Votre post « ${post.subject} » a été approuvé`,
          actionUrl: `/posts/${postId}`,
        });
      } else if (action === 'reject') {
        await createNotification({
          userId: post.authorId,
          type: 'post_rejected',
          title: 'Post rejeté',
          message: `Votre post « ${post.subject} » a été rejeté`,
          actionUrl: `/posts/${postId}`,
        });
      } else if (action === 'request_changes' && comment) {
        await createNotification({
          userId: post.authorId,
          type: 'comment_added',
          title: 'Nouveau commentaire',
          message: `Un commentaire a été ajouté à « ${post.subject} »`,
          actionUrl: `/posts/${postId}`,
        });
      }
    }

    return NextResponse.json({ post: updatedPost, validation });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
