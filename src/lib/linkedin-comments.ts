/**
 * LinkedIn Comments API Helper
 *
 * Fonctions utilitaires pour interagir avec les commentaires LinkedIn
 * via l'API REST v2 (Social Actions API).
 *
 * Endpoints utilisés :
 *   - GET  /rest/socialActions/{shareUrn}/comments — Récupérer les commentaires
 *   - POST /rest/socialActions/{shareUrn}/comments — Ajouter un commentaire
 *
 * Référence : https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/ugc-post-api?tabs=http
 */

import { linkedinHeaders, LINKEDIN_BASE_URL } from './linkedin-config';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface LinkedInComment {
  /** URN du commentaire (ex: urn:li:comment:(urn:li:activity:xxx,12345)) */
  commentUrn: string;
  /** Texte du commentaire */
  text: string;
  /** Nom de l'auteur (si disponible) */
  authorName: string | null;
  /** URN de l'auteur */
  authorUrn: string | null;
  /** Nombre de likes du commentaire */
  likes: number;
  /** Date de création (ISO string) */
  createdAt: string;
}

export interface LinkedInCommentActor {
  name?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  firstName?: string;
  lastName?: string;
}

// ──────────────────────────────────────────────
// Helpers internes
// ──────────────────────────────────────────────

/**
 * Extrait le nom de l'auteur à partir de l'objet actor renvoyé par LinkedIn.
 */
function extractAuthorName(actor: Record<string, unknown>): string | null {
  if (!actor) return null;

  const name = actor.name;
  if (typeof name === 'string' && name) return name;

  for (const key of ['localizedFirstName', 'firstName']) {
    const val = actor[key];
    if (typeof val === 'string' && val) {
      const last = actor.localizedLastName || actor.lastName;
      return typeof last === 'string' && last ? `${val} ${last}` : val;
    }
  }

  return null;
}

/**
 * Extrait l'URN de l'auteur.
 */
function extractAuthorUrn(actor: Record<string, unknown>): string | null {
  if (!actor) return null;
  return (actor.urn || actor.actorUrn || actor.id) as string | null;
}

// ──────────────────────────────────────────────
// API publique
// ──────────────────────────────────────────────

/**
 * Récupère les commentaires d'un post LinkedIn.
 *
 * @param accessToken - Token d'accès LinkedIn (Bearer)
 * @param postUrn - URN du post LinkedIn (ex: urn:li:share:7458773164437929985)
 * @param options - Options supplémentaires (pagination)
 * @returns Liste des commentaires
 */
export async function fetchPostComments(
  accessToken: string,
  postUrn: string,
  options?: {
    /** Nombre maximum de commentaires à récupérer (défaut: 50) */
    count?: number;
    /** Offset de pagination (défaut: 0) */
    start?: number;
  },
): Promise<{ comments: LinkedInComment[]; total: number }> {
  const count = options?.count ?? 50;
  const start = options?.start ?? 0;

  const url = new URL(
    `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(postUrn)}/comments`,
  );
  url.searchParams.set('orderBy', 'RECENCY');
  url.searchParams.set('count', String(count));
  url.searchParams.set('start', String(start));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: linkedinHeaders(accessToken),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `Erreur API LinkedIn (fetch comments): HTTP ${response.status} — ${errorBody}`,
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const elements = (data.elements as Array<Record<string, unknown>>) || [];
  const paging = (data.paging as Record<string, unknown>) || {};
  const total = (paging.total as number) ?? elements.length;

  const comments: LinkedInComment[] = elements.map((el) => {
    const message = (el.message as Record<string, unknown>) || {};
    const text = (message.text as string) || '';

    const actor = (el.actor as Record<string, unknown>) || {};

    // Nombre de likes
    const socialMeta = (el.socialMetadata as Record<string, unknown>) || {};
    let likes = 0;
    const totalSocialActionCounts = socialMeta.totalSocialActionCounts as
      | Array<Record<string, unknown>>
      | undefined;
    if (Array.isArray(totalSocialActionCounts)) {
      const likesEntry = totalSocialActionCounts.find(
        (a) => a['$type'] === 'com.linkedin.common.SocialActionCounts',
      );
      likes = (likesEntry?.['likes'] as number) ?? 0;
    }

    return {
      commentUrn: (el.commentUrn as string) || (el.$id as string) || '',
      text,
      authorName: extractAuthorName(actor),
      authorUrn: extractAuthorUrn(actor),
      likes: Number(likes) || 0,
      createdAt: (el.created as Record<string, unknown>)?.time
        ? new Date(
            ((el.created as Record<string, unknown>).time as number) *
              1000,
          ).toISOString()
        : (el.created?.time as string)
          ? new Date((el.created as Record<string, unknown>).time as number * 1000).toISOString()
          : new Date().toISOString(),
    };
  });

  return { comments, total };
}

/**
 * Publie une réponse à un commentaire LinkedIn.
 *
 * Utilise l'endpoint POST /socialActions/{shareUrn}/comments
 * avec un objet parentComment (socialActionUrn du commentaire parent).
 *
 * @param accessToken - Token d'accès LinkedIn (Bearer)
 * @param postUrn - URN du post LinkedIn (ex: urn:li:share:7458773164437929985)
 * @param commentUrn - URN du commentaire auquel répondre
 * @param replyText - Texte de la réponse
 * @returns true si la réponse a été publiée avec succès
 */
export async function replyToComment(
  accessToken: string,
  postUrn: string,
  commentUrn: string,
  replyText: string,
): Promise<{ success: boolean; error?: string }> {
  const url = `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(postUrn)}/comments`;

  // Le payload pour répondre à un commentaire spécifique
  // utilise le champ "parentComment" avec l'URN du commentaire parent
  const payload = {
    actor: `urn:li:person:`, // Sera remplacé par l'auteur réel
    message: {
      text: replyText,
    },
    object: postUrn,
    // Pour une réponse directe à un commentaire
    ...(commentUrn ? { parentComment: commentUrn } : {}),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return {
        success: false,
        error: `LinkedIn API HTTP ${response.status}: ${errorBody}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error
        ? err.message
        : 'Erreur réseau lors de la réponse LinkedIn',
    };
  }
}

/**
 * Publie un commentaire sur un post LinkedIn (pas une réponse à un autre commentaire).
 *
 * @param accessToken - Token d'accès LinkedIn (Bearer)
 * @param postUrn - URN du post LinkedIn
 * @param personId - ID personne LinkedIn pour l'actor URN
 * @param commentText - Texte du commentaire
 * @returns true si le commentaire a été publié avec succès
 */
export async function postComment(
  accessToken: string,
  postUrn: string,
  personId: string,
  commentText: string,
): Promise<{ success: boolean; error?: string; commentId?: string }> {
  const url = `${LINKEDIN_BASE_URL}/socialActions/${encodeURIComponent(postUrn)}/comments`;

  const payload = {
    actor: `urn:li:person:${personId}`,
    message: {
      text: commentText,
    },
    object: postUrn,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return {
        success: false,
        error: `LinkedIn API HTTP ${response.status}: ${errorBody}`,
      };
    }

    // Récupérer l'ID du commentaire créé depuis le header x-restli-id
    const commentId = response.headers.get('x-restli-id');

    return { success: true, commentId: commentId ?? undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error
        ? err.message
        : 'Erreur réseau lors de la publication du commentaire',
    };
  }
}
