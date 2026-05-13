import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, aiLimiter } from '@/lib/rate-limit';
import { callAI, AIMessage } from '@/lib/ai-providers';

// ============================================================
// Types
// ============================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  currentView?: string;
  selectedPostId?: string;
  selectedProspectId?: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  context?: ChatContext;
}

// ============================================================
// System prompt (in French)
// ============================================================

const BASE_SYSTEM_PROMPT = `Tu es l'Assistant IA DataSphere, un expert en stratégie de contenu LinkedIn et en marketing B2B. Tu aides les utilisateurs à :

- Analyser et optimiser leurs posts LinkedIn
- Générer des idées de contenu pertinentes et engageantes
- Améliorer leur stratégie de publication
- Augmenter leur engagement et leur visibilité
- Conseiller sur les meilleures pratiques LinkedIn

Règles de réponse :
- Réponds TOUJOURS en français
- Sois concis mais informatif (utilise des listes à puces quand c'est utile)
- Utilise du markdown pour structurer tes réponses (titres, listes, gras, etc.)
- Donne des conseils actionnables et concrets
- Adapte tes réponses au contexte de l'utilisateur quand il est disponible
- Si on te fournit des données de posts ou de prospects, analyse-les en profondeur
- Sois professionnel mais chaleureux`;

// ============================================================
// POST: Chat with AI
// ============================================================

export async function POST(request: Request) {
  try {
    // Auth check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Rate limit
    const rlResult = await rateLimitMiddleware(aiLimiter, request, `chat:${authUser.id}`);
    if (rlResult) return rlResult;

    // Parse body
    const body: ChatRequestBody = await request.json();
    const { messages, context } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un message est requis' },
        { status: 400 }
      );
    }

    // Build system prompt with context
    let systemPrompt = BASE_SYSTEM_PROMPT;
    let contextData: string[] = [];

    // Fetch post data if context includes a post
    if (context?.selectedPostId) {
      try {
        const post = await db.post.findFirst({
          where: { id: context.selectedPostId, authorId: authUser.id },
          include: {
            metrics: { orderBy: { collectedAt: 'desc' }, take: 1 },
            author: { select: { name: true, role: true } },
          },
        });

        if (post) {
          const metrics = post.metrics[0];
          contextData.push(
            `POST EN CONTEXTE :`,
            `- Sujet : ${post.subject}`,
            post.angle ? `- Angle : ${post.angle}` : '',
            post.audience ? `- Public cible : ${post.audience}` : '',
            post.cta ? `- CTA : ${post.cta}` : '',
            `- Statut : ${post.status}`,
            post.contentScore ? `- Score de contenu : ${post.contentScore}/100` : '',
            `- Fournisseur IA : ${post.aiProvider}`,
            post.finalContent ? `- Contenu (extrait) : ${post.finalContent.slice(0, 500)}...` : '',
            metrics ? `- Métriques : impressions=${metrics.impressions}, likes=${metrics.likes}, commentaires=${metrics.comments}, partages=${metrics.reposts}, taux d'engagement=${metrics.engagementRate}%` : '',
          ).filter(Boolean).join('\n');
        }
      } catch (err) {
        console.warn('[Chat API] Failed to fetch post context:', err);
      }
    }

    // Fetch prospect data if context includes a prospect
    if (context?.selectedProspectId) {
      try {
        const prospect = await db.prospect.findFirst({
          where: { id: context.selectedProspectId, userId: authUser.id },
          include: {
            outreachMessages: {
              orderBy: { createdAt: 'desc' },
              take: 3,
            },
          },
        });

        if (prospect) {
          contextData.push(
            `PROSPECT EN CONTEXTE :`,
            `- Nom : ${prospect.fullName}`,
            prospect.title ? `- Poste : ${prospect.title}` : '',
            prospect.company ? `- Entreprise : ${prospect.company}` : '',
            prospect.headline ? `- Headline : ${prospect.headline}` : '',
            `- Statut : ${prospect.status}`,
            `- Score : ${prospect.score}/100`,
            prospect.tags ? `- Tags : ${prospect.tags}` : '',
            prospect.notes ? `- Notes : ${prospect.notes.slice(0, 200)}` : '',
            prospect.outreachMessages && prospect.outreachMessages.length > 0
              ? `- Derniers messages (${prospect.outreachMessages.length}) : ${prospect.outreachMessages.map(m => `"${m.content.slice(0, 100)}..." (${m.status})`).join(' | ')}`
              : '',
          ).filter(Boolean).join('\n');
        }
      } catch (err) {
        console.warn('[Chat API] Failed to fetch prospect context:', err);
      }
    }

    // Append current view info
    if (context?.currentView) {
      const viewNames: Record<string, string> = {
        dashboard: 'Tableau de bord',
        posts: 'Liste des posts',
        'create-post': 'Création de post',
        'post-detail': 'Détail d\'un post',
        analytics: 'Analytics',
        'ab-testing': 'Tests A/B',
        calendar: 'Calendrier',
        prompts: 'Bibliothèque de prompts',
        settings: 'Paramètres',
        competitors: 'Veille concurrentielle',
        'brand-voice': 'Brand Voice',
        'content-ideas': 'Idées de contenu',
        prospects: 'Prospection',
        'ai-agent': 'Agent IA',
      };
      const viewName = viewNames[context.currentView] || context.currentView;
      contextData.push(`L'utilisateur navigue actuellement sur la vue : ${viewName}`);
    }

    // Add context data to system prompt if any
    if (contextData.length > 0) {
      systemPrompt += `\n\nCONTEXTE ACTUEL DE L'UTILISATEUR :\n${contextData.join('\n\n')}\n\nUtilise ces informations pour personnaliser tes réponses. Réponds de manière pertinente par rapport au contexte fourni.`;
    }

    // Build messages array for AI
    const aiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call AI (uses callAI which has provider fallback)
    const response = await callAI(aiMessages, {
      temperature: 0.7,
      maxTokens: 1200,
    });

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la réponse' },
      { status: 500 }
    );
  }
}
