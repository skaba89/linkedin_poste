import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import { linkedinHeaders, LINKEDIN_BASE_URL } from '@/lib/linkedin-config';
import ZAI from 'z-ai-web-dev-sdk';

// ──────────────────────────────────────────────
// In-memory rate limiter: 20 replies per hour per user
// ──────────────────────────────────────────────
const replyTimestamps: Record<string, number[]> = {};
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetsIn: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  if (!replyTimestamps[userId]) {
    replyTimestamps[userId] = [];
  }

  // Prune old entries
  replyTimestamps[userId] = replyTimestamps[userId].filter((ts) => ts > windowStart);

  const remaining = RATE_LIMIT_MAX - replyTimestamps[userId].length;
  if (remaining <= 0) {
    const oldest = replyTimestamps[userId][0];
    return { allowed: false, remaining: 0, resetsIn: oldest + RATE_LIMIT_WINDOW_MS - now };
  }

  return { allowed: true, remaining: remaining - 1, resetsIn: RATE_LIMIT_WINDOW_MS };
}

/**
 * POST /api/linkedin/auto-reply
 * Body: { postId: string, commentId: string, tone?: string }
 *
 * Flow:
 * 1. Validate auth + rate limit
 * 2. Fetch the AudienceComment + Post + LinkedInAccount
 * 3. Generate an AI reply using ZAI
 * 4. Attempt to POST the reply to LinkedIn
 * 5. If LinkedIn fails → save as suggestedReply for manual use
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ──
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ── Rate limit ──
    const rateCheck = checkRateLimit(authUser.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Limite de réponses automatiques atteinte (20/heure)',
          resetsIn: Math.ceil(rateCheck.resetsIn / 60_000),
        },
        { status: 429 },
      );
    }

    // ── Parse body ──
    const body = await request.json();
    const { postId, commentId, tone, style } = body as {
      postId: string;
      commentId: string;
      tone?: string;
      style?: 'concis' | 'détaillé' | 'mini_article';
    };

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: 'postId et commentId sont requis' },
        { status: 400 },
      );
    }

    // ── Fetch comment ──
    const comment = await db.audienceComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.postId !== postId) {
      return NextResponse.json(
        { error: 'Commentaire introuvable ou ne correspond pas au post' },
        { status: 404 },
      );
    }

    // Prevent duplicate auto-replies
    if (comment.replyPosted) {
      return NextResponse.json(
        { error: 'Une réponse a déjà été publiée pour ce commentaire' },
        { status: 409 },
      );
    }

    // ── Fetch Post + LinkedInAccount ──
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        linkedinAccount: {
          select: { id: true, accessToken: true, personId: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    if (!post.linkedinAccount || !post.linkedinAccount.personId) {
      return NextResponse.json(
        { error: 'Compte LinkedIn non configuré (personId manquant)' },
        { status: 400 },
      );
    }

    if (!post.linkedinPostId) {
      return NextResponse.json(
        { error: 'Ce post n\'a pas encore été publié sur LinkedIn' },
        { status: 400 },
      );
    }

    // ── Generate AI reply ──
    const replyStyle = style || 'concis';

    const stylePrompts: Record<string, { system: string; maxTokens: number; maxLength: number }> = {
      concis: {
        system: 'Tu es un expert LinkedIn B2B. Génère une réponse courte (1-3 phrases), professionnelle mais chaleureuse, qui encourage le dialogue. Max 200 caractères.',
        maxTokens: 150,
        maxLength: 200,
      },
      détaillé: {
        system: 'Tu es un expert LinkedIn B2B. Génère une réponse détaillée (4-8 phrases) qui apporte de la valeur, partage une perspective ou un conseil concret. Utilise des sauts de ligne pour la lisibilité. Max 800 caractères.',
        maxTokens: 400,
        maxLength: 800,
      },
      mini_article: {
        system: `Tu es un expert LinkedIn B2B thought leader. Génère une réponse de type mini-article (8-15 phrases) qui :
1. Valide le point de vue de l'auteur du commentaire
2. Apporte une perspective experte avec des exemples concrets
3. Partage une insight actionnable ou un chiffre clé
4. Pose une question ouverte pour relancer le dialogue

Utilise des paragraphes courts avec des sauts de ligne. Style authentique, pas promotionnel. Max 1300 caractères.`,
        maxTokens: 600,
        maxLength: 1300,
      },
    };

    const styleConfig = stylePrompts[replyStyle] || stylePrompts.concis;
    const systemPrompt = styleConfig.system;

    const toneInstruction = tone
      ? ` Adopte un ton ${tone}.`
      : ' Adopte un ton professionnel et chaleureux.';

    const userPrompt = `Voici le sujet du post original : "${post.subject}"
${post.finalContent ? `\nContenu du post :\n${post.finalContent.slice(0, 500)}` : ''}

Commentaire de ${comment.authorName || 'un utilisateur'} : "${comment.content}"

Réponds à ce commentaire.${toneInstruction}`;

    let replyContent: string;

    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: styleConfig.maxTokens,
      });

      replyContent = completion.choices[0]?.message?.content?.trim() || '';

      // Truncate to max length for this style
      if (replyContent.length > styleConfig.maxLength) {
        replyContent = replyContent.slice(0, styleConfig.maxLength - 3).trim() + '...';
      }

      if (!replyContent) {
        return NextResponse.json(
          { error: 'L\'IA n\'a pas pu générer de réponse' },
          { status: 500 },
        );
      }
    } catch (aiError) {
      console.error('ZAI generation error:', aiError);
      return NextResponse.json(
        { error: 'Erreur lors de la génération de la réponse IA' },
        { status: 500 },
      );
    }

    // ── Attempt to post reply to LinkedIn ──
    const { accessToken, personId } = post.linkedinAccount;
    const shareUrn = post.linkedinPostId; // e.g. urn:li:share:7458773164437929985

    // Use the correct endpoint: POST /socialActions/{shareUrn}/comments
    const linkedinPayload = {
      actor: `urn:li:person:${personId}`,
      message: { text: replyContent },
    };

    let postedToLinkedIn = false;
    let linkedinError: string | null = null;

    try {
      const linkedinRes = await fetch(`${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(shareUrn)}/comments`, {
        method: 'POST',
        headers: linkedinHeaders(accessToken),
        body: JSON.stringify(linkedinPayload),
      });

      if (linkedinRes.ok) {
        postedToLinkedIn = true;
      } else {
        const errorBody = await linkedinRes.text();
        linkedinError = `LinkedIn ${linkedinRes.status}: ${errorBody}`;
        console.error('LinkedIn auto-reply error:', linkedinError);
      }
    } catch (fetchError) {
      linkedinError = `Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`;
      console.error('LinkedIn auto-reply network error:', fetchError);
    }

    // ── Record the timestamp for rate limiting ──
    if (postedToLinkedIn) {
      if (!replyTimestamps[authUser.id]) replyTimestamps[authUser.id] = [];
      replyTimestamps[authUser.id].push(Date.now());
    }

    // ── Save to DB ──
    const updatedComment = await db.audienceComment.update({
      where: { id: comment.id },
      data: {
        suggestedReply: replyContent,
        replyPosted: postedToLinkedIn,
        ...(postedToLinkedIn ? { repliedAt: new Date() } : {}),
      },
    });

    // ── Audit log ──
    await createAuditLog({
      entityType: 'AudienceComment',
      entityId: comment.id,
      action: postedToLinkedIn ? 'auto_reply_posted' : 'auto_reply_suggested',
      userId: authUser.id,
      metadata: {
        postId: post.id,
        linkedinPostId: post.linkedinPostId,
        commentContent: comment.content.slice(0, 100),
        replyContent,
        tone: tone || null,
        postedToLinkedIn,
        linkedinError: linkedinError || null,
      },
    });

    return NextResponse.json({
      success: true,
      postedToLinkedIn,
      comment: updatedComment,
      replyContent,
      ...(linkedinError ? { linkedinError } : {}),
      rateLimitRemaining: replyTimestamps[authUser.id]
        ? RATE_LIMIT_MAX - replyTimestamps[authUser.id].length
        : RATE_LIMIT_MAX,
    });
  } catch (error) {
    console.error('auto-reply route error:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
