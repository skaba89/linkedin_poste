import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { linkedinHeaders, LINKEDIN_BASE_URL } from '@/lib/linkedin-config';

// ──────────────────────────────────────────────
// Simple keyword-based sentiment detection
// ──────────────────────────────────────────────
function detectSentiment(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('?')) return 'question';
  if (['merci', 'super', 'excellent', 'génial', 'bravo', 'intéressant', 'top', 'bien vu', '赞同', '谢谢'].some(w => lower.includes(w))) return 'positive';
  if (["pas d'accord", 'faux', 'décevant', 'mauvais', 'nul', 'ridicule'].some(w => lower.includes(w))) return 'negative';
  return 'neutral';
}

/**
 * Extract author name from LinkedIn actor URN or from the API response.
 * The actor can be: "urn:li:person:XXXX" — the name is in nested `actor.name` or `actor.*.localizedFirstName`.
 */
function extractAuthorName(actor: Record<string, unknown>): string | null {
  // Try common shapes returned by the LinkedIn API
  const name = actor.name;
  if (typeof name === 'string' && name) return name;

  // Nested localized name (v2 style)
  for (const key of ['localizedFirstName', 'firstName']) {
    const val = actor[key];
    if (typeof val === 'string' && val) {
      const last = actor.localizedLastName || actor.lastName;
      return typeof last === 'string' && last ? `${val} ${last}` : val;
    }
  }

  return null;
}

// ──────────────────────────────────────────────
// GET /api/linkedin/fetch-comments?linkedinPostId=urn:li:share:...
// Fetches comments from LinkedIn and upserts them into AudienceComment.
// ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // ── Auth ──
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ── Params ──
    const { searchParams } = new URL(request.url);
    const linkedinPostId = searchParams.get('linkedinPostId');

    if (!linkedinPostId) {
      return NextResponse.json(
        { error: 'Paramètre linkedinPostId requis' },
        { status: 400 },
      );
    }

    // ── Resolve the linkedinPostId into a Post + LinkedInAccount ──
    const post = await db.post.findFirst({
      where: { linkedinPostId },
      include: {
        linkedinAccount: {
          select: { id: true, accessToken: true, personId: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post introuvable pour ce linkedinPostId' },
        { status: 404 },
      );
    }

    if (!post.linkedinAccount) {
      return NextResponse.json(
        { error: 'Aucun compte LinkedIn associé à ce post' },
        { status: 400 },
      );
    }

    const { accessToken } = post.linkedinAccount;
    const urn = linkedinPostId; // e.g. urn:li:share:7458773164437929985

    // ── Call LinkedIn API ──
    const url = `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(urn)}/comments?orderBy=RECENCY`;

    const linkedinRes = await fetch(url, {
      method: 'GET',
      headers: linkedinHeaders(accessToken),
    });

    if (!linkedinRes.ok) {
      const errorBody = await linkedinRes.text();
      console.error('LinkedIn fetch-comments error:', linkedinRes.status, errorBody);

      // Parse error details from LinkedIn
      let isPermissionError = false;
      try {
        const errJson = JSON.parse(errorBody);
        if (errJson.code === 'ACCESS_DENIED' || linkedinRes.status === 403) {
          isPermissionError = true;
        }
      } catch { /* ignore parse error */ }

      await createAuditLog({
        entityType: 'Post',
        entityId: post.id,
        action: 'fetch_comments_failed',
        userId: authUser.id,
        metadata: { linkedinPostId, status: linkedinRes.status, error: errorBody },
      });

      if (isPermissionError) {
        return NextResponse.json({
          comments: [],
          total: 0,
          created: 0,
          skipped: 0,
          message: "L'application LinkedIn n'a pas les permissions nécessaires pour lire les commentaires. L'import automatique nécessite les scopes Marketing Developer Platform (r_member_social ou w_member_social via MDP). Vous pouvez ajouter les commentaires manuellement ci-dessous.",
          permissionError: true,
        });
      }

      return NextResponse.json(
        { error: `Erreur LinkedIn API: ${linkedinRes.status}` },
        { status: 502 },
      );
    }

    const data = await linkedinRes.json();
    const elements: Array<Record<string, unknown>> = (data.elements as Array<Record<string, unknown>>) || [];

    if (elements.length === 0) {
      return NextResponse.json({ comments: [], total: 0, message: 'Aucun commentaire trouvé' });
    }

    // ── Parse & deduplicate comments ──
    let createdCount = 0;
    let skippedCount = 0;
    const savedComments: Array<Record<string, unknown>> = [];

    for (const el of elements) {
      // Extract text from the message field
      const message = el.message as Record<string, unknown> | undefined;
      const content = (message?.text as string) || '';
      if (!content.trim()) continue;

      // Extract author name
      const actor = (el.actor as Record<string, unknown>) || {};
      const authorName = extractAuthorName(actor);

      // Extract likes / social metadata
      const socialMeta = (el.socialMetadata as Record<string, unknown>) || {};
      const likesCount = (socialMeta.totalSocialActionCounts as Array<Record<string, unknown>>)
        ? (socialMeta.totalSocialActionCounts as Array<Record<string, unknown>>)
            .find((a) => a['$type'] === 'com.linkedin.common.SocialActionCounts')
            ?.['likes'] ?? 0
        : 0;

      // Extract the comment URN for tracking
      const commentUrn = el.commentUrn as string || el.$id as string || null;

      // Deduplication: check if we already have this exact comment for this post
      const existing = await db.audienceComment.findFirst({
        where: {
          postId: post.id,
          content: content,
          authorName: authorName ?? '',
        },
      });

      if (existing) {
        // Optionally update the linkedinCommentId if we have it now
        if (commentUrn && !existing.linkedinCommentId) {
          await db.audienceComment.update({
            where: { id: existing.id },
            data: { linkedinCommentId: commentUrn, likes: Number(likesCount) || existing.likes },
          });
        }
        skippedCount++;
        savedComments.push({ id: existing.id, content, authorName, likes: Number(likesCount) || existing.likes, sentiment: existing.sentiment, existing: true });
        continue;
      }

      const sentiment = detectSentiment(content);

      const comment = await db.audienceComment.create({
        data: {
          postId: post.id,
          authorName: authorName || null,
          content,
          likes: Number(likesCount) || 0,
          sentiment,
          linkedinCommentId: commentUrn,
        },
      });

      createdCount++;
      savedComments.push({ id: comment.id, content, authorName, likes: comment.likes, sentiment: comment.sentiment, existing: false });
    }

    // ── Audit log ──
    await createAuditLog({
      entityType: 'Post',
      entityId: post.id,
      action: 'fetch_comments',
      userId: authUser.id,
      metadata: {
        linkedinPostId,
        totalFromLinkedIn: elements.length,
        created: createdCount,
        skipped: skippedCount,
      },
    });

    return NextResponse.json({
      comments: savedComments,
      total: savedComments.length,
      created: createdCount,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error('fetch-comments route error:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
