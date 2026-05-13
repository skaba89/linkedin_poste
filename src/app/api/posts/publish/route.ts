import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { linkedinHeaders } from '@/lib/linkedin-config';

async function publishToLinkedIn(
  accessToken: string,
  organizationId: string,
  content: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const response = await fetch(
      'https://api.linkedin.com/rest/posts',
      {
        method: 'POST',
        headers: linkedinHeaders(accessToken),
        body: JSON.stringify({
          author: `urn:li:organization:${organizationId}`,
          commentary: content,
          visibility: 'PUBLIC',
          lifecycleState: 'PUBLISHED',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `LinkedIn API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      postId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue LinkedIn',
    };
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    // Rate limit: 5 publications per hour per user
    if (!rateLimit(`publish:${authUser.id}`, 5, 3600000)) {
      return NextResponse.json(
        { error: 'Limite de publication atteinte. Maximum 5 par heure.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: 'ID du post requis' }, { status: 400 });
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      include: { linkedinAccount: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    if (post.status !== 'approved') {
      return NextResponse.json(
        { error: 'Le post doit être approuvé avant publication' },
        { status: 400 }
      );
    }

    if (!post.finalContent) {
      return NextResponse.json(
        { error: 'Le contenu final est requis pour la publication' },
        { status: 400 }
      );
    }

    // Get LinkedIn account - use the one linked to the post or find active one
    let linkedinAccount = post.linkedinAccount;
    if (!linkedinAccount) {
      linkedinAccount = await db.linkedInAccount.findFirst({
        where: { isActive: true },
      });
    }

    if (!linkedinAccount) {
      return NextResponse.json(
        { error: 'Aucun compte LinkedIn connecté. Configurez votre connexion LinkedIn dans les paramètres.' },
        { status: 400 }
      );
    }

    if (!linkedinAccount.organizationId) {
      return NextResponse.json(
        { error: 'Aucune page entreprise LinkedIn configurée' },
        { status: 400 }
      );
    }

    // Publish to LinkedIn
    const result = await publishToLinkedIn(
      linkedinAccount.accessToken,
      linkedinAccount.organizationId,
      post.finalContent
    );

    // If token error, mark account and allow retry
    const isTokenError = result.error && (
      result.error.toLowerCase().includes('token') ||
      result.error.toLowerCase().includes('expired') ||
      result.error.toLowerCase().includes('invalid') ||
      result.error.includes('401')
    );

    // Log publication attempt
    const pubLog = await db.publicationLog.create({
      data: {
        postId,
        status: result.success ? 'success' : 'failed',
        errorMessage: result.error || null,
        linkedinPostId: result.postId || null,
        publishedAt: result.success ? new Date() : null,
      },
    });

    // Update post status - keep as 'approved' if token error so user can retry after reconnecting
    const updatedPost = await db.post.update({
      where: { id: postId },
      data: {
        status: result.success ? 'posted' : isTokenError ? 'approved' : 'failed',
        linkedinPostId: result.postId || null,
        errorMessage: result.error || null,
        linkedinAccountId: linkedinAccount.id,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        publicationLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    // If token expired, update account to reflect it
    if (isTokenError) {
      await db.linkedInAccount.update({
        where: { id: linkedinAccount.id },
        data: {
          tokenExpiresAt: new Date(), // Mark as expired now
        },
      });
    }

    await createAuditLog({
      entityType: 'Post',
      entityId: postId,
      action: result.success ? 'publish_success' : 'publish_failed',
      userId: authUser.id,
      metadata: {
        linkedinPostId: result.postId,
        organizationId: linkedinAccount.organizationId,
        error: result.error,
      },
    });

    // Notify post author
    if (result.success) {
      await createNotification({
        userId: post.authorId,
        type: 'post_published',
        title: 'Post publié',
        message: `Votre post « ${post.subject} » a été publié sur LinkedIn`,
        actionUrl: `/posts/${postId}`,
        metadata: { linkedinPostId: result.postId },
      });
    } else if (!isTokenError) {
      await createNotification({
        userId: post.authorId,
        type: 'post_failed',
        title: 'Publication échouée',
        message: `La publication de « ${post.subject} » a échoué`,
        actionUrl: `/posts/${postId}`,
        metadata: { error: result.error },
      });
    }

    return NextResponse.json({
      post: updatedPost,
      publicationLog: pubLog,
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
