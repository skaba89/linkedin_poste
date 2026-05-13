import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { createAuditLog } from '@/lib/audit';
import ZAI from 'z-ai-web-dev-sdk';

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  keywords: string[];
  emotion: string;
  intensity: number;
}

const SENTIMENT_SYSTEM_PROMPT = `Tu es un expert en analyse de sentiment. Analyse le texte fourni et retourne UNIQUEMENT un objet JSON valide (sans backticks, sans commentaire) avec cette structure exacte :
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidence": <nombre 0.0 à 1.0>,
  "keywords": ["mot1", "mot2", ...],
  "emotion": "joie" | "confiance" | "surprise" | "colère" | "tristesse" | "peur" | "dégoût" | "neutre",
  "intensity": <nombre 0.0 à 1.0>
}

Règles :
- "sentiment" : overall du texte (positive=négatif positif, negative=négatif, neutral=neutre, mixed=ambigu ou conflitant)
- "confidence" : degré de certitude (0=très incertain, 1=certain)
- "keywords" : 3-8 mots-clés importants extraits du texte
- "emotion" : émotion dominante détectée
- "intensity" : force de l'émotion (0=très faible, 1=extrêmement fort)
- Le texte est en français (commentaires LinkedIn B2B)`;

async function analyzeSingleText(text: string): Promise<SentimentResult> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SENTIMENT_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '{}';

  // Try to extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      sentiment: 'neutral',
      confidence: 0.3,
      keywords: [],
      emotion: 'neutre',
      intensity: 0.2,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sentiment: ['positive', 'negative', 'neutral', 'mixed'].includes(parsed.sentiment)
        ? parsed.sentiment
        : 'neutral',
      confidence: typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : [],
      emotion: typeof parsed.emotion === 'string' ? parsed.emotion : 'neutre',
      intensity: typeof parsed.intensity === 'number'
        ? Math.min(1, Math.max(0, parsed.intensity))
        : 0.3,
    };
  } catch {
    return {
      sentiment: 'neutral',
      confidence: 0.3,
      keywords: [],
      emotion: 'neutre',
      intensity: 0.2,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { commentIds, text } = body as {
      commentIds?: string[];
      text?: string;
    };

    if (!commentIds?.length && !text) {
      return NextResponse.json(
        { error: 'commentIds ou text requis' },
        { status: 400 },
      );
    }

    // Single text analysis (no DB update)
    if (text && !commentIds?.length) {
      const result = await analyzeSingleText(text);
      return NextResponse.json({ result });
    }

    // Analyze comments from DB
    const ids = (commentIds || []).slice(0, 20); // max 20 at once
    const comments = await db.audienceComment.findMany({
      where: { id: { in: ids } },
    });

    if (comments.length === 0) {
      return NextResponse.json(
        { error: 'Aucun commentaire trouvé' },
        { status: 404 },
      );
    }

    const results: Array<{ commentId: string; result: SentimentResult }> = [];

    // Process in parallel (max 5 concurrent)
    const batchSize = 5;
    for (let i = 0; i < comments.length; i += batchSize) {
      const batch = comments.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (comment) => {
          const result = await analyzeSingleText(comment.content);
          return { commentId: comment.id, result };
        }),
      );
      results.push(...batchResults);
    }

    // Update comments in DB
    const sentimentMap: Record<string, string> = {};
    for (const { commentId, result } of results) {
      sentimentMap[commentId] = result.sentiment;
    }

    await db.$transaction(
      results.map(({ commentId, result }) =>
        db.audienceComment.update({
          where: { id: commentId },
          data: {
            sentiment: result.sentiment,
          },
        }),
      ),
    );

    // Audit log
    await createAuditLog({
      entityType: 'AudienceComment',
      action: 'sentiment_analysis_batch',
      userId: authUser.id,
      metadata: {
        commentCount: results.length,
        sentimentSummary: {
          positive: results.filter((r) => r.result.sentiment === 'positive').length,
          negative: results.filter((r) => r.result.sentiment === 'negative').length,
          neutral: results.filter((r) => r.result.sentiment === 'neutral').length,
          mixed: results.filter((r) => r.result.sentiment === 'mixed').length,
        },
      },
    });

    return NextResponse.json({
      analyzed: results.length,
      results,
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'analyse de sentiment' }, { status: 500 });
  }
}
