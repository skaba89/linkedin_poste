/**
 * LinkedIn Webhook Endpoint
 *
 * Gère les webhooks entrants de LinkedIn :
 *   - GET  : Vérification du webhook (challenge-response)
 *   - POST : Réception des événements (commentaire ajouté, supprimé, like)
 *
 * Documentation LinkedIn :
 *   https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/ugc-post-api
 *
 * Variables d'environnement requises :
 *   LINKEDIN_WEBHOOK_SECRET — Secret partagé pour la vérification du webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ──────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.LINKEDIN_WEBHOOK_SECRET || '';

// ──────────────────────────────────────────────
// Types LinkedIn webhook
// ──────────────────────────────────────────────

interface LinkedInWebhookEvent {
  /** Type de l'événement LinkedIn */
  $type?: string;
  /** URN de l'auteur de l'action */
  actor?: string;
  /** URN du post concerné */
  object?: string;
  /** Détails de l'interaction */
  data?: Record<string, unknown>;
}

interface LinkedInWebhookBody {
  /** Token de vérification (non utilisé ici, on utilise state) */
  webhookCode?: string;
  /** Type d'événement */
  event?: string;
  /** List des événements */
  data?: Array<Record<string, unknown>>;
  /** Corps brut pour log */
  [key: string]: unknown;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Détection de sentiment simple basée sur des mots-clés.
 * Copiée du pattern existant dans fetch-comments/route.ts
 */
function detectSentiment(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('?')) return 'question';
  if (
    ['merci', 'super', 'excellent', 'génial', 'bravo', 'intéressant', 'top', 'bien vu', '赞同', '谢谢'].some(
      (w) => lower.includes(w),
    )
  )
    return 'positive';
  if (
    ["pas d'accord", 'faux', 'décevant', 'mauvais', 'nul', 'ridicule'].some(
      (w) => lower.includes(w),
    )
  )
    return 'negative';
  return 'neutral';
}

/**
 * Extrait l'URN du post à partir de l'événement LinkedIn.
 * Les webhooks LinkedIn envoient généralement l'URN du share (ex: urn:li:share:xxx)
 */
function extractPostUrn(event: Record<string, unknown>): string | null {
  // Formats possibles : object, socialActivity.associatedObject, shareUrn, etc.
  for (const key of ['object', 'shareUrn', 'associatedObject', 'item']) {
    const val = event[key];
    if (typeof val === 'string' && val.includes('urn:li:')) return val;
  }
  // Parfois l'URN est imbriquée dans un sous-objet
  const data = event.data as Record<string, unknown> | undefined;
  if (data) {
    for (const key of ['object', 'shareUrn', 'associatedObject', 'item', 'value']) {
      const val = data[key];
      if (typeof val === 'string' && val.includes('urn:li:')) return val;
    }
  }
  return null;
}

/**
 * Extrait le texte du commentaire depuis l'événement.
 */
function extractCommentText(event: Record<string, unknown>): string {
  const data = event.data as Record<string, unknown> | undefined;
  const message = (data?.message ?? event.message) as Record<string, unknown> | undefined;
  if (message?.text && typeof message.text === 'string') return message.text;
  // Alternative: champ commentText
  const commentText = data?.commentText ?? event.commentText;
  if (typeof commentText === 'string') return commentText;
  return '';
}

/**
 * Extrait le nom de l'auteur depuis l'événement.
 */
function extractActorName(event: Record<string, unknown>): string | null {
  const actor = event.actor as Record<string, unknown> | undefined;
  if (!actor) return null;
  if (typeof actor.name === 'string') return actor.name;
  if (typeof actor.localizedFirstName === 'string') {
    const last = actor.localizedLastName;
    return typeof last === 'string' ? `${actor.localizedFirstName} ${last}` : actor.localizedFirstName;
  }
  // Retourner l'URN si pas de nom disponible
  if (typeof actor === 'string') return actor;
  return null;
}

// ──────────────────────────────────────────────
// GET : Vérification du webhook (challenge-response)
// ──────────────────────────────────────────────
// LinkedIn envoie une requête GET avec un challenge_code pour vérifier le webhook.
// On doit répondre avec { "challenge_response": "<challenge_code>" }
// et vérifier que le paramètre state correspond à notre secret.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const challengeCode = searchParams.get('challenge_code');
  const state = searchParams.get('state');

  // Vérification du secret
  if (!state || state !== WEBHOOK_SECRET) {
    console.warn('[LinkedIn Webhook] Échec de vérification — state invalide ou manquant');
    return NextResponse.json(
      { error: 'Vérification échouée : état invalide' },
      { status: 403 },
    );
  }

  if (!challengeCode) {
    console.warn('[LinkedIn Webhook] challenge_code manquant dans la requête');
    return NextResponse.json(
      { error: 'Paramètre challenge_code manquant' },
      { status: 400 },
    );
  }

  console.log('[LinkedIn Webhook] Vérification réussie — challenge_response envoyé');

  return NextResponse.json({
    challenge_response: challengeCode,
  });
}

// ──────────────────────────────────────────────
// POST : Réception des événements LinkedIn
// ──────────────────────────────────────────────
// LinkedIn envoie des événements quand des interactions se produisent sur les posts
// de l'application : commentaires ajoutés/supprimés, likes, etc.

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LinkedInWebhookBody;

    console.log('[LinkedIn Webhook] Événement reçu :', JSON.stringify(body).slice(0, 500));

    // Déterminer le type d'événement
    const eventType = body.event || body.webhookCode || 'unknown';

    // Traiter en fonction du type d'événement
    switch (eventType) {
      case 'comment_added':
      case 'COMMENT_ADDED':
        await handleCommentAdded(body);
        break;

      case 'comment_deleted':
      case 'COMMENT_DELETED':
        await handleCommentDeleted(body);
        break;

      case 'like_added':
      case 'LIKE_ADDED':
        await handleLikeAdded(body);
        break;

      default:
        console.log(`[LinkedIn Webhook] Type d'événement non géré : ${eventType}`);
        // Log l'événement pour diagnostic
        break;
    }

    // Toujours répondre 200 rapidement pour que LinkedIn considère le webhook comme fonctionnel
    return NextResponse.json({ received: true, event: eventType });
  } catch (error) {
    console.error('[LinkedIn Webhook] Erreur de traitement :', error);
    // Même en cas d'erreur, on répond 200 pour éviter que LinkedIn désactive le webhook
    return NextResponse.json({ received: true, error: 'Erreur de traitement interne' });
  }
}

// ──────────────────────────────────────────────
// Handlers d'événements
// ──────────────────────────────────────────────

/**
 * Gère l'ajout d'un commentaire :
 * - Stocke le commentaire dans AudienceComment
 * - Si auto-reply est activé, crée une activité agent en file d'attente
 */
async function handleCommentAdded(body: LinkedInWebhookBody): Promise<void> {
  // Les événements LinkedIn peuvent contenir un tableau data ou un objet unique
  const events = Array.isArray(body.data) ? body.data : [body as unknown as Record<string, unknown>];

  for (const event of events) {
    const evt = event as Record<string, unknown>;

    const postUrn = extractPostUrn(evt);
    const commentText = extractCommentText(evt);
    const actorName = extractActorName(evt);

    if (!postUrn || !commentText) {
      console.log('[LinkedIn Webhook] Impossible d\'extraire postUrn ou commentText de l\'événement');
      continue;
    }

    // Trouver le post correspondant dans notre base
    const post = await db.post.findFirst({
      where: {
        linkedinPostId: postUrn,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    if (!post) {
      console.log(`[LinkedIn Webhook] Post non trouvé pour l'URN : ${postUrn}`);
      continue;
    }

    // Vérifier si le commentaire existe déjà (déduplication)
    const existingComment = await db.audienceComment.findFirst({
      where: {
        postId: post.id,
        content: commentText,
        authorName: actorName ?? '',
      },
    });

    if (existingComment) {
      console.log('[LinkedIn Webhook] Commentaire déjà existant, ignoré');
      continue;
    }

    // Stocker le commentaire
    const sentiment = detectSentiment(commentText);

    const savedComment = await db.audienceComment.create({
      data: {
        postId: post.id,
        authorName: actorName || null,
        content: commentText,
        sentiment,
        linkedinCommentId: evt.commentUrn as string || evt.$id as string || null,
      },
    });

    console.log(
      `[LinkedIn Webhook] Commentaire stocké — Post: ${post.id}, Commentaire: ${savedComment.id}, Sentiment: ${sentiment}`,
    );

    // Vérifier si l'auto-reply est activé pour cet utilisateur
    const agentConfig = await db.agentConfig.findUnique({
      where: {
        userId_agentType: {
          userId: post.authorId,
          agentType: 'engagement_bot',
        },
      },
    });

    if (agentConfig?.enabled) {
      // Créer une activité agent en file d'attente pour le traitement ultérieur
      await db.agentActivity.create({
        data: {
          userId: post.authorId,
          agentType: 'engagement_bot',
          status: 'pending',
          title: `Réponse automatique en attente — ${post.subject.slice(0, 50)}`,
          description: `Nouveau commentaire de ${actorName || 'utilisateur'}: "${commentText.slice(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
          metadata: JSON.stringify({
            postId: post.id,
            audienceCommentId: savedComment.id,
            linkedinPostId: postUrn,
            commentText: commentText.slice(0, 500),
            actorName,
            sentiment,
            autoApprove: agentConfig.autoApprove,
            trigger: 'webhook',
          }),
        },
      });

      console.log(
        `[LinkedIn Webhook] Activité agent créée — Auto-reply ${agentConfig.autoApprove ? 'auto-approuvé' : 'en attente de validation'}`,
      );
    }
  }
}

/**
 * Gère la suppression d'un commentaire :
 * - Supprime le commentaire de AudienceComment si on le connaît
 */
async function handleCommentDeleted(body: LinkedInWebhookBody): Promise<void> {
  const events = Array.isArray(body.data) ? body.data : [body as unknown as Record<string, unknown>];

  for (const event of events) {
    const evt = event as Record<string, unknown>;
    const commentUrn = (evt.commentUrn as string) || (evt.$id as string) || '';

    if (!commentUrn) continue;

    // Rechercher et supprimer le commentaire correspondant
    const deleted = await db.audienceComment.deleteMany({
      where: { linkedinCommentId: commentUrn },
    });

    if (deleted.count > 0) {
      console.log(`[LinkedIn Webhook] Commentaire supprimé (${deleted.count} entrée(s)) — URN: ${commentUrn}`);
    }
  }
}

/**
 * Gère l'ajout d'un like :
 * - Pour l'instant, on ne fait que logger. Les likes sur les commentaires
 *   pourraient être utilisés plus tard pour prioriser les réponses automatiques.
 */
async function handleLikeAdded(body: LinkedInWebhookBody): Promise<void> {
  const events = Array.isArray(body.data) ? body.data : [body as unknown as Record<string, unknown>];

  for (const event of events) {
    const evt = event as Record<string, unknown>;
    const postUrn = extractPostUrn(evt);

    if (postUrn) {
      console.log(`[LinkedIn Webhook] Like reçu sur le post : ${postUrn}`);
    }
  }

  // Pas de traitement supplémentaire pour les likes pour l'instant
  // Les likes sont trackés via les métriques de posts (PostMetric)
}
