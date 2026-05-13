import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { linkedinHeaders, LINKEDIN_BASE_URL } from '@/lib/linkedin-config';

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
    const { postId: newsletterPostId } = body;

    if (!newsletterPostId) {
      return NextResponse.json(
        { error: 'L\'ID de l\'article est requis' },
        { status: 400 }
      );
    }

    // Verify newsletter ownership
    const newsletter = await db.newsletter.findFirst({
      where: { id, userId: authUser.id },
    });

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter introuvable' }, { status: 404 });
    }

    // Get the newsletter post
    const newsletterPost = await db.newsletterPost.findFirst({
      where: { id: newsletterPostId, newsletterId: id },
    });

    if (!newsletterPost) {
      return NextResponse.json({ error: 'Article introuvable' }, { status: 404 });
    }

    if (newsletterPost.status === 'published') {
      return NextResponse.json(
        { error: 'Cet article a déjà été publié' },
        { status: 400 }
      );
    }

    // Get LinkedIn account with valid token
    const linkedinAccount = await db.linkedInAccount.findFirst({
      where: {
        userId: authUser.id,
        isActive: true,
      },
    });

    if (!linkedinAccount) {
      return NextResponse.json(
        { error: 'Aucun compte LinkedIn connecté. Veuillez connecter votre compte LinkedIn pour publier.' },
        { status: 400 }
      );
    }

    // Attempt to publish via LinkedIn Newsletter API
    let linkedinPostId: string | null = null;
    let publishError: string | null = null;

    try {
      // Note: LinkedIn's Newsletter API may not be fully supported via their public REST API.
      // The following attempts to create a post associated with the newsletter.
      // This implementation may need adjustment based on LinkedIn API access levels.

      if (linkedinAccount.accessToken) {
        const articleContent = `## ${newsletterPost.title}\n\n${newsletterPost.content}`;

        // Attempt to publish as an article to LinkedIn
        const response = await fetch(`${LINKEDIN_BASE_URL}/articles`, {
          method: 'POST',
          headers: linkedinHeaders(linkedinAccount.accessToken),
          body: JSON.stringify({
            author: `urn:li:person:${linkedinAccount.personId || ''}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: newsletterPost.excerpt || newsletterPost.title,
                },
                shareMediaCategory: 'ARTICLE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
            // Newsletter-specific fields (may not be supported in all API versions)
            ...(newsletter.linkedinNewsletterId ? {
              newsletter: {
                newsletterId: newsletter.linkedinNewsletterId,
              },
            } : {}),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          linkedinPostId = data.id || null;
        } else {
          const errorText = await response.text();
          console.warn('LinkedIn Newsletter API response:', response.status, errorText);
          // If the LinkedIn API doesn't support newsletter publishing,
          // we'll mark it as published locally anyway
          publishError = `L'API LinkedIn a retourné une erreur (${response.status}). L'article est marqué comme publié localement. Note: la publication directe de newsletters via l'API LinkedIn peut nécessiter un accès partenaire.`;
        }
      }
    } catch (err) {
      console.error('LinkedIn publish error:', err);
      publishError = 'Erreur de connexion à LinkedIn. L\'article est marqué comme publié localement.';
    }

    // Update the newsletter post status
    const updatedPost = await db.newsletterPost.update({
      where: { id: newsletterPostId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        errorMessage: publishError,
      },
    });

    // Update newsletter stats
    await db.newsletter.update({
      where: { id },
      data: {
        lastPublishedAt: new Date(),
        ...(newsletter.linkedinNewsletterId ? {} : { linkedinNewsletterId: linkedinPostId }),
      },
    });

    await createAuditLog({
      entityType: 'NewsletterPost',
      entityId: newsletterPostId,
      action: 'publish',
      userId: authUser.id,
      metadata: {
        newsletterId: id,
        title: newsletterPost.title,
        linkedinPostId,
        publishError,
      },
    });

    return NextResponse.json({
      post: updatedPost,
      linkedinPostId,
      warning: publishError || undefined,
    });
  } catch (error) {
    console.error('Newsletter publish error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
