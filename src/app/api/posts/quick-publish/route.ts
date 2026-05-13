import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { linkedinHeaders } from '@/lib/linkedin-config';
import { generatePostImage } from '@/lib/generate-post-image';

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
        error: (errorData as Record<string, string>).message || `LinkedIn API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, postId: data.id };
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

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes. Seuls les administrateurs peuvent utiliser la publication rapide.' },
        { status: 403 }
      );
    }

    // Rate limit: 10 quick publishes per hour per admin
    if (!rateLimit(`quick-publish:${authUser.id}`, 10, 3600000)) {
      return NextResponse.json(
        { error: 'Limite de publication rapide atteinte. Maximum 10 par heure.' },
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

    if (post.status === 'posted') {
      return NextResponse.json({ error: 'Ce post a déjà été publié' }, { status: 400 });
    }

    // Get LinkedIn account
    let linkedinAccount = post.linkedinAccount;
    if (!linkedinAccount) {
      linkedinAccount = await db.linkedInAccount.findFirst({
        where: { isActive: true },
      });
    }

    if (!linkedinAccount) {
      return NextResponse.json(
        { error: 'Aucun compte LinkedIn connecté. Allez dans Paramètres pour configurer votre connexion LinkedIn.' },
        { status: 400 }
      );
    }

    if (!linkedinAccount.organizationId) {
      return NextResponse.json(
        { error: 'Aucune page entreprise LinkedIn configurée. Vérifiez votre Organization ID dans les paramètres.' },
        { status: 400 }
      );
    }

    // Validate organizationId is numeric
    if (!/^\d+$/.test(linkedinAccount.organizationId)) {
      return NextResponse.json(
        { error: `L'Organization ID "${linkedinAccount.organizationId}" est invalide. Il doit être un numéro (ex: 12345678). Vous pouvez le trouver dans l'URL de votre page LinkedIn.` },
        { status: 400 }
      );
    }

    // Step 1: Set finalContent if not already set
    const finalContent = post.finalContent || post.subject;
    let imageUrl = post.imageUrl;

    // Step 2: Update status to 'approved'
    await db.post.update({
      where: { id: postId },
      data: { finalContent, status: 'approved' },
    });

    // Step 3: Generate image if no imageUrl exists
    if (!imageUrl) {
      try {
        const generatedUrl = await generatePostImage(post.subject, post.id);
        if (generatedUrl) {
          imageUrl = generatedUrl;
          await db.post.update({
            where: { id: postId },
            data: { imageUrl },
          });
        }
      } catch (imgError) {
        console.error('Image generation failed, continuing without image:', imgError);
      }
    }

    // Step 4: Publish to LinkedIn
    const result = await publishToLinkedIn(
      linkedinAccount.accessToken,
      linkedinAccount.organizationId,
      finalContent
    );

    const isTokenError = result.error && (
      result.error.toLowerCase().includes('token') ||
      result.error.toLowerCase().includes('expired') ||
      result.error.toLowerCase().includes('invalid') ||
      result.error.includes('401')
    );

    const pubLog = await db.publicationLog.create({
      data: {
        postId,
        status: result.success ? 'success' : 'failed',
        errorMessage: result.error || null,
        linkedinPostId: result.postId || null,
        publishedAt: result.success ? new Date() : null,
      },
    });

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

    if (isTokenError) {
      await db.linkedInAccount.update({
        where: { id: linkedinAccount.id },
        data: { tokenExpiresAt: new Date() },
      });
    }

    await createAuditLog({
      entityType: 'Post',
      entityId: postId,
      action: result.success ? 'quick_publish_success' : 'quick_publish_failed',
      userId: authUser.id,
      metadata: {
        linkedinPostId: result.postId,
        organizationId: linkedinAccount.organizationId,
        error: result.error,
        imageGenerated: !!imageUrl && !post.imageUrl,
      },
    });

    if (result.success) {
      await createNotification({
        userId: post.authorId,
        type: 'post_published',
        title: 'Post publié (rapide)',
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
      success: result.success,
      error: result.error,
      post: updatedPost,
      publicationLog: pubLog,
    });
  } catch (error) {
    console.error('Quick publish error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
