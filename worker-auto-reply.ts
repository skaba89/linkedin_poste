/**
 * Auto-Reply Cron Worker
 *
 * Exécute périodiquement (toutes les 10 minutes) la vérification des nouveaux commentaires
 * sur les posts LinkedIn récents et génère des réponses automatiques via l'IA.
 *
 * Workflow pour chaque utilisateur avec auto-reply activé (AgentConfig 'engagement_bot') :
 *   1. Récupère le token d'accès LinkedIn
 *   2. Récupère les posts publiés dans les 7 derniers jours
 *   3. Pour chaque post, récupère les commentaires récents via LinkedIn API
 *   4. Pour chaque nouveau commentaire (pas déjà dans AudienceComment) :
 *      - Analyse le sentiment
 *      - Génère une réponse IA contextuelle via z-ai-web-dev-sdk
 *      - Stocke le commentaire dans AudienceComment avec la réponse suggérée
 *      - Si autoApprove est activé : publie la réponse sur LinkedIn
 *      - Sinon : crée une notification pour validation manuelle
 *
 * Gestion d'arrêt gracieux (SIGTERM, SIGINT).
 *
 * Usage :
 *   bun run worker-auto-reply.ts
 *   pm2 start ecosystem.config.js    (gère Next.js + workers)
 */

import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL || 'file:/app/db/custom.db';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DATABASE_URL;
}

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const LINKEDIN_API_VERSION = '202510';
const LINKEDIN_BASE_URL = 'https://api.linkedin.com/rest';

// Nombre maximum de réponses automatiques par cycle par utilisateur
const MAX_REPLIES_PER_CYCLE = 10;

// Fenêtre de recherche des posts récents (7 jours)
const POST_AGE_DAYS = 7;

// ---------------------------------------------------------------------------
// Prisma client (standalone, pas d'alias de chemin Next.js)
// ---------------------------------------------------------------------------

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const prefix = `[auto-reply-worker]`;
  const extra = meta ? ' ' + JSON.stringify(meta) : '';
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${ts} ${prefix} ${level.toUpperCase()}: ${message}${extra}`);
}

function linkedinHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

// ---------------------------------------------------------------------------
// Détection de sentiment
// ---------------------------------------------------------------------------

function detectSentiment(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('?')) return 'question';
  if (['merci', 'super', 'excellent', 'génial', 'bravo', 'intéressant', 'top', 'bien vu', '赞同', '谢谢'].some((w) => lower.includes(w))) return 'positive';
  if (["pas d'accord", 'faux', 'décevant', 'mauvais', 'nul', 'ridicule'].some((w) => lower.includes(w))) return 'negative';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Récupération des commentaires LinkedIn
// ---------------------------------------------------------------------------

interface LinkedInComment {
  commentUrn: string;
  text: string;
  authorName: string | null;
  authorUrn: string | null;
  likes: number;
  createdAt: string;
}

async function fetchLinkedInComments(
  accessToken: string,
  shareUrn: string,
): Promise<LinkedInComment[]> {
  const url = `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(shareUrn)}/comments?orderBy=RECENCY&count=50`;

  const response = await fetch(url, {
    method: 'GET',
    headers: linkedinHeaders(accessToken),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`LinkedIn API (fetch comments): HTTP ${response.status} — ${errorBody}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const elements = (data.elements as Array<Record<string, unknown>>) || [];

  return elements.map((el) => {
    const message = (el.message as Record<string, unknown>) || {};
    const text = (message.text as string) || '';
    const actor = (el.actor as Record<string, unknown>) || {};

    let authorName: string | null = null;
    const name = actor.name;
    if (typeof name === 'string' && name) authorName = name;
    if (!authorName) {
      for (const key of ['localizedFirstName', 'firstName']) {
        const val = actor[key];
        if (typeof val === 'string' && val) {
          const last = actor.localizedLastName || actor.lastName;
          authorName = typeof last === 'string' && last ? `${val} ${last}` : val;
          break;
        }
      }
    }

    // Nombre de likes
    const socialMeta = (el.socialMetadata as Record<string, unknown>) || {};
    let likes = 0;
    const totalSocialActionCounts = socialMeta.totalSocialActionCounts as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(totalSocialActionCounts)) {
      const likesEntry = totalSocialActionCounts.find(
        (a) => a['$type'] === 'com.linkedin.common.SocialActionCounts',
      );
      likes = (likesEntry?.['likes'] as number) ?? 0;
    }

    return {
      commentUrn: (el.commentUrn as string) || (el.$id as string) || '',
      text,
      authorName,
      authorUrn: (actor.urn as string) || (actor.actorUrn as string) || null,
      likes: Number(likes) || 0,
      createdAt: new Date().toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Publication de réponse sur LinkedIn
// ---------------------------------------------------------------------------

async function postReplyToLinkedIn(
  accessToken: string,
  shareUrn: string,
  personId: string,
  replyText: string,
): Promise<{ success: boolean; error?: string }> {
  const url = `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(shareUrn)}/comments`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify({
        actor: `urn:li:person:${personId}`,
        message: { text: replyText },
        object: shareUrn,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return { success: false, error: `LinkedIn ${response.status}: ${errorBody}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur réseau LinkedIn',
    };
  }
}

// ---------------------------------------------------------------------------
// Génération de réponse IA
// ---------------------------------------------------------------------------

async function generateAIReply(
  postSubject: string,
  postContent: string | null,
  commentAuthor: string | null,
  commentText: string,
  sentiment: string,
): Promise<string> {
  // Import dynamique de z-ai-web-dev-sdk (uniquement côté serveur)
  const ZAI = (await import('z-ai-web-dev-sdk')).default;

  const zai = await ZAI.create();

  // Adapter le prompt système en fonction du sentiment
  let systemPrompt = 'Tu es un expert en engagement LinkedIn B2B. ';
  systemPrompt += 'Génère une réponse courte (1-3 phrases), professionnelle mais chaleureuse, ';
  systemPrompt += 'qui encourage le dialogue. Max 200 caractères. Réponds uniquement avec le texte de la réponse, sans guillemets.';

  const sentimentInstruction: Record<string, string> = {
    positive: ' Le commentaire est très positif, remercie chaleureusement.',
    negative: ' Le commentaire est négatif ou critique. Reste diplomate et professionnel, valide le point de vue tout en apportant de la nuance.',
    question: ' Le commentaire contient une question. Réponds de façon précise et utile.',
    neutral: ' Le commentaire est neutre, engage la conversation avec une question ou un complément.',
  };

  systemPrompt += sentimentInstruction[sentiment] || sentimentInstruction.neutral;

  const userPrompt = `Sujet du post original : "${postSubject}"
${postContent ? `\nContenu du post :\n${postContent.slice(0, 500)}` : ''}

Commentaire de ${commentAuthor || 'un utilisateur'} : "${commentText}"

Réponds à ce commentaire.`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 150,
  });

  let replyContent = completion.choices[0]?.message?.content?.trim() || '';

  // Nettoyer : supprimer les guillemets englobants si présents
  replyContent = replyContent.replace(/^["']|["']$/g, '');

  // Tronquer à 200 caractères si nécessaire
  if (replyContent.length > 200) {
    replyContent = replyContent.slice(0, 197).trim() + '...';
  }

  return replyContent;
}

// ---------------------------------------------------------------------------
// Traitement principal
// ---------------------------------------------------------------------------

async function processAutoReplies(): Promise<void> {
  const now = new Date();
  log('info', 'Démarrage du cycle de traitement auto-reply...');

  // 1. Trouver tous les utilisateurs avec auto-reply activé
  const enabledConfigs = await prisma.agentConfig.findMany({
    where: {
      agentType: 'engagement_bot',
      enabled: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          linkedinAccounts: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
  });

  if (enabledConfigs.length === 0) {
    log('info', 'Aucun utilisateur avec auto-reply activé.');
    return;
  }

  log('info', `${enabledConfigs.length} utilisateur(s) avec auto-reply activé.`);

  // 2. Traiter chaque utilisateur
  for (const config of enabledConfigs) {
    const user = config.user;
    const account = user.linkedinAccounts[0];

    if (!account) {
      log('warn', `Aucun compte LinkedIn actif pour l'utilisateur ${user.name} (${user.id}).`);
      continue;
    }

    try {
      await processUserAutoReply(user.id, account.id, config.autoApprove);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      log('error', `Erreur de traitement pour ${user.name} (${user.id}): ${message}`);
    }

    // Mettre à jour lastExecutedAt
    await prisma.agentConfig.update({
      where: {
        userId_agentType: {
          userId: user.id,
          agentType: 'engagement_bot',
        },
      },
      data: { lastExecutedAt: now },
    });
  }
}

async function processUserAutoReply(
  userId: string,
  linkedinAccountId: string,
  autoApprove: boolean,
): Promise<void> {
  // Récupérer les posts publiés dans les 7 derniers jours avec un linkedinPostId
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - POST_AGE_DAYS);

  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      status: 'posted',
      linkedinPostId: { not: null },
      linkedinAccountId,
      updatedAt: { gte: sevenDaysAgo },
    },
    include: {
      linkedinAccount: {
        select: { accessToken: true, personId: true },
      },
      audienceComments: {
        select: { linkedinCommentId: true, content: true, authorName: true },
      },
    },
  });

  if (posts.length === 0) {
    log('info', `Aucun post récent trouvé pour l'utilisateur ${userId}.`);
    return;
  }

  log('info', `${posts.length} post(s) récent(s) à vérifier pour l'utilisateur ${userId}.`);

  let repliesGenerated = 0;

  for (const post of posts) {
    if (repliesGenerated >= MAX_REPLIES_PER_CYCLE) {
      log('info', `Limite de ${MAX_REPLIES_PER_CYCLE} réponses atteinte pour ce cycle.`);
      break;
    }

    if (!post.linkedinPostId || !post.linkedinAccount?.accessToken || !post.linkedinAccount?.personId) {
      continue;
    }

    await processPostComments(post, autoApprove).then((count) => {
      repliesGenerated += count;
    });
  }
}

async function processPostComments(
  post: {
    id: string;
    subject: string;
    finalContent: string | null;
    linkedinPostId: string;
    linkedinAccount: { accessToken: string; personId: string } | null;
    audienceComments: Array<{ linkedinCommentId: string | null; content: string; authorName: string | null }>;
  },
  autoApprove: boolean,
): Promise<number> {
  const { accessToken, personId } = post.linkedinAccount!;
  const shareUrn = post.linkedinPostId;

  let repliesCount = 0;

  try {
    // Récupérer les commentaires depuis LinkedIn
    const linkedinComments = await fetchLinkedInComments(accessToken, shareUrn);

    if (linkedinComments.length === 0) {
      return 0;
    }

    log('info', `${linkedinComments.length} commentaire(s) LinkedIn trouvé(s) pour le post "${post.subject.slice(0, 40)}" (${post.id.slice(0, 8)}).`);

    // Construire un set de commentaires déjà existants pour la déduplication
    const existingComments = new Set<string>();
    for (const existing of post.audienceComments) {
      // Clé de déduplication : URN LinkedIn ou combinaison contenu+auteur
      const key = existing.linkedinCommentId || `${existing.content}::${existing.authorName || ''}`;
      existingComments.add(key);
    }

    // Traiter chaque nouveau commentaire
    for (const comment of linkedinComments) {
      const dedupKey = comment.commentUrn || `${comment.text}::${comment.authorName || ''}`;

      if (existingComments.has(dedupKey)) {
        continue;
      }

      // Marquer comme traité pour éviter les doublons dans ce cycle
      existingComments.add(dedupKey);

      const sentiment = detectSentiment(comment.text);

      // Générer une réponse IA
      let replyContent: string;
      try {
        replyContent = await generateAIReply(
          post.subject,
          post.finalContent,
          comment.authorName,
          comment.text,
          sentiment,
        );
      } catch (aiError) {
        const errMsg = aiError instanceof Error ? aiError.message : 'Erreur IA inconnue';
        log('error', `Erreur de génération IA pour le commentaire de ${comment.authorName}: ${errMsg}`);
        continue;
      }

      if (!replyContent) {
        log('warn', 'IA n\'a pas généré de réponse, commentaire ignoré.');
        continue;
      }

      // Stocker le commentaire avec la réponse suggérée
      const savedComment = await prisma.audienceComment.create({
        data: {
          postId: post.id,
          authorName: comment.authorName,
          content: comment.text,
          likes: comment.likes,
          sentiment,
          linkedinCommentId: comment.commentUrn || null,
          suggestedReply: replyContent,
          replyPosted: false,
        },
      });

      // Si autoApprove est activé, publier la réponse sur LinkedIn
      if (autoApprove) {
        log('info', `Auto-approbation activée — Publication de la réponse sur LinkedIn...`);

        const result = await postReplyToLinkedIn(accessToken, shareUrn, personId, replyContent);

        if (result.success) {
          await prisma.audienceComment.update({
            where: { id: savedComment.id },
            data: {
              replyPosted: true,
              repliedAt: new Date(),
            },
          });

          // Créer une activité agent terminée
          await prisma.agentActivity.create({
            data: {
              userId: post.authorId,
              agentType: 'engagement_bot',
              status: 'completed',
              title: `Réponse automatique publiée — ${post.subject.slice(0, 50)}`,
              description: `Réponse publiée au commentaire de ${comment.authorName || 'utilisateur'}`,
              metadata: JSON.stringify({
                postId: post.id,
                audienceCommentId: savedComment.id,
                linkedinPostId: shareUrn,
                replyContent,
                autoApprove: true,
                trigger: 'cron',
              }),
            },
          });

          log('info', `Réponse publiée avec succès pour le commentaire de ${comment.authorName}.`);
        } else {
          log('warn', `Échec de publication LinkedIn: ${result.error}`);

          // Mettre à jour l'activité en échec
          await prisma.agentActivity.create({
            data: {
              userId: post.authorId,
              agentType: 'engagement_bot',
              status: 'failed',
              title: `Échec de réponse automatique — ${post.subject.slice(0, 50)}`,
              description: `Impossible de publier la réponse au commentaire de ${comment.authorName || 'utilisateur'}: ${result.error}`,
              metadata: JSON.stringify({
                postId: post.id,
                audienceCommentId: savedComment.id,
                linkedinPostId: shareUrn,
                replyContent,
                error: result.error,
                trigger: 'cron',
              }),
            },
          });
        }
      } else {
        // Mode validation manuelle — créer une notification
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: 'comment_added',
            title: 'Nouveau commentaire — Réponse IA suggérée',
            message: `Un nouveau commentaire de ${comment.authorName || 'un utilisateur'} sur "${post.subject.slice(0, 50)}" : "${comment.text.slice(0, 80)}${comment.text.length > 80 ? '...' : ''}". Réponse IA suggérée: "${replyContent}"`,
            actionUrl: `/posts/${post.id}`,
            metadata: JSON.stringify({
              audienceCommentId: savedComment.id,
              suggestedReply: replyContent,
              sentiment,
              trigger: 'cron',
            }),
          },
        });

        // Créer une activité agent en attente
        await prisma.agentActivity.create({
          data: {
            userId: post.authorId,
            agentType: 'engagement_bot',
            status: 'pending',
            title: `Réponse en attente de validation — ${post.subject.slice(0, 50)}`,
            description: `Nouveau commentaire de ${comment.authorName || 'utilisateur'} nécessite une validation`,
            metadata: JSON.stringify({
              postId: post.id,
              audienceCommentId: savedComment.id,
              linkedinPostId: shareUrn,
              replyContent,
              autoApprove: false,
              trigger: 'cron',
            }),
          },
        });

        log('info', `Notification créée pour validation manuelle du commentaire de ${comment.authorName}.`);
      }

      repliesCount++;

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            entityType: 'AudienceComment',
            entityId: savedComment.id,
            action: 'auto_reply_generated',
            userId: post.authorId,
            metadata: JSON.stringify({
              postId: post.id,
              commentAuthor: comment.authorName,
              sentiment,
              replyContent,
              autoApprove,
              trigger: 'cron',
              source: 'auto_reply_worker',
            }),
          },
        });
      } catch {
        // Audit log en best-effort
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    log('error', `Erreur de traitement des commentaires pour le post ${post.id}: ${message}`);
  }

  return repliesCount;
}

// ---------------------------------------------------------------------------
// Traitement des activités agent en attente (issues des webhooks)
// ---------------------------------------------------------------------------

async function processPendingActivities(): Promise<void> {
  const pendingActivities = await prisma.agentActivity.findMany({
    where: {
      agentType: 'engagement_bot',
      status: 'pending',
    },
    include: {
      user: {
        select: {
          id: true,
          linkedinAccounts: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
    take: 20,
  });

  if (pendingActivities.length === 0) return;

  log('info', `${pendingActivities.length} activité(s) en attente à traiter.`);

  for (const activity of pendingActivities) {
    try {
      const metadata = JSON.parse(activity.metadata || '{}') as Record<string, unknown>;
      const autoApprove = metadata.autoApprove as boolean ?? false;

      if (autoApprove) {
        // Traitement automatique : publier la réponse
        const audienceCommentId = metadata.audienceCommentId as string;
        const postId = metadata.postId as string;
        const replyContent = metadata.replyContent as string;
        const linkedinPostId = metadata.linkedinPostId as string;

        if (!audienceCommentId || !postId || !replyContent || !linkedinPostId) {
          log('warn', `Activité ${activity.id} — métadonnées incomplètes, passage en échec.`);
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: 'failed', description: 'Métadonnées incomplètes' },
          });
          continue;
        }

        const account = activity.user.linkedinAccounts[0];
        if (!account) {
          log('warn', `Activité ${activity.id} — pas de compte LinkedIn.`);
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: 'failed', description: 'Compte LinkedIn non trouvé' },
          });
          continue;
        }

        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { subject: true, linkedinPostId: true },
        });

        if (!post) {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: 'failed', description: 'Post non trouvé' },
          });
          continue;
        }

        // Si pas de réponse suggérée encore, la générer
        let finalReply = replyContent;
        if (!finalReply) {
          const comment = await prisma.audienceComment.findUnique({
            where: { id: audienceCommentId },
          });
          if (comment && post) {
            finalReply = await generateAIReply(
              post.subject,
              null, // Pas besoin de recharger le contenu complet
              comment.authorName,
              comment.content,
              comment.sentiment || 'neutral',
            );
          }
        }

        if (!finalReply) {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: { status: 'failed', description: 'Impossible de générer une réponse' },
          });
          continue;
        }

        const result = await postReplyToLinkedIn(
          account.accessToken,
          linkedinPostId,
          account.personId || '',
          finalReply,
        );

        if (result.success) {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: {
              status: 'completed',
              description: `Réponse publiée automatiquement.`,
              result: JSON.stringify({ replyContent: finalReply }),
            },
          });

          // Mettre à jour le commentaire
          await prisma.audienceComment.update({
            where: { id: audienceCommentId },
            data: {
              suggestedReply: finalReply,
              replyPosted: true,
              repliedAt: new Date(),
            },
          });

          log('info', `Activité ${activity.id} — réponse publiée avec succès.`);
        } else {
          await prisma.agentActivity.update({
            where: { id: activity.id },
            data: {
              status: 'failed',
              description: `Erreur LinkedIn: ${result.error}`,
            },
          });
        }
      } else {
        // Mode validation manuelle — créer une notification si pas déjà fait
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: activity.userId,
            type: 'comment_added',
            metadata: { contains: activity.id },
          },
        });

        if (!existingNotification) {
          await prisma.notification.create({
            data: {
              userId: activity.userId,
              type: 'comment_added',
              title: 'Réponse IA en attente de validation',
              message: activity.description || 'Un commentaire nécessite votre validation.',
              metadata: JSON.stringify({ agentActivityId: activity.id }),
            },
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      log('error', `Erreur traitement activité ${activity.id}: ${message}`);

      await prisma.agentActivity.update({
        where: { id: activity.id },
        data: { status: 'failed', description: message.slice(0, 200) },
      }).catch(() => {
        // Best-effort
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Boucle principale du worker
// ---------------------------------------------------------------------------

async function runCycle(): Promise<void> {
  const now = new Date();
  log('info', '=== Nouveau cycle de traitement ===', { time: now.toISOString() });

  try {
    // 1. Traiter les activités en attente (issues des webhooks)
    await processPendingActivities();
  } catch (err) {
    log('error', `Erreur lors du traitement des activités en attente: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    // 2. Traiter les auto-réponses planifiées (scan des posts)
    await processAutoReplies();
  } catch (err) {
    log('error', `Erreur lors du traitement auto-reply: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Arrêt gracieux
// ---------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', `Signal ${signal} reçu, arrêt gracieux en cours...`);
  try {
    await prisma.$disconnect();
  } catch {
    // Ignorer
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  log('error', `Exception non interceptée : ${err instanceof Error ? err.message : String(err)}`);
});
process.on('unhandledRejection', (reason) => {
  log('error', `Promesse rejetée non gérée : ${reason instanceof Error ? reason.message : String(reason)}`);
});

// ---------------------------------------------------------------------------
// Point d'entrée principal
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log('info', 'Worker auto-reply démarré.');
  log('info', `Intervalle : ${POLL_INTERVAL_MS / 1000}s | Base de données : ${DATABASE_URL}`);
  log('info', `Limite réponses/cycle : ${MAX_REPLIES_PER_CYCLE} | Fenêtre posts : ${POST_AGE_DAYS} jours`);

  // Exécuter immédiatement au démarrage
  await runCycle();

  // Puis scruter à intervalle régulier
  const timer = setInterval(async () => {
    if (shuttingDown) return;
    try {
      await runCycle();
    } catch (err) {
      log('error', `Erreur du cycle: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, POLL_INTERVAL_MS);

  // Maintenir le processus actif (empêcher le GC du timer)
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

main().catch((err) => {
  log('error', `Erreur fatale du worker: ${err instanceof Error ? err.message : String(err)}`);
  prisma.$disconnect().finally(() => process.exit(1));
});
