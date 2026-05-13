import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI, AIMessage } from '@/lib/ai-providers';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const { calendarItems } = body;

    if (!calendarItems || !Array.isArray(calendarItems) || calendarItems.length === 0) {
      return NextResponse.json({ error: 'calendarItems requis' }, { status: 400 });
    }

    // Fetch posting slot data for optimization context
    const postingSlots = await db.postingSlot.findMany({
      where: { userId: authUser.id },
      orderBy: { avgEngagement: 'desc' },
    });

    const bestTimesStr = postingSlots
      .slice(0, 10)
      .map((s) => `Jour ${s.dayOfWeek} à ${s.hour}h - engagement moyen: ${s.avgEngagement.toFixed(2)}`)
      .join('\n');

    const itemsSummary = calendarItems.map((item: Record<string, unknown>, i: number) => {
      const d = new Date(item.plannedDate as string);
      const dayOfWeek = d.getDay();
      return `${i + 1}. [${item.date || d.toISOString().split('T')[0]}] ${item.plannedTime || '--:--'} | ${item.format || 'text'} | ${item.priority || 'medium'} | "${item.topic as string}"`;
    }).join('\n');

    const systemPrompt = `Tu es un expert en optimisation de calendrier de contenu LinkedIn B2B. Tu analyses et optimises un planning existant pour maximiser l'engagement.

Règles d'optimisation :
- Alterner les formats de contenu (pas 2 textes à suivre, pas 2 carrousels le même jour)
- Ne pas poster plus de 2 fois par jour
- Placer le contenu haute priorité aux meilleurs créneaux
- Assurer une couverture régulière (pas de "trous" de plus de 2 jours)
- Suggérer des jours sans contenu quand c'est pertinent
- Proposer des réordonnancements concrets et actionnables

FORMATS: text, image, carousel, poll, article, video
PRIORITÉS: high, medium, low

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte additionnel, sans backticks markdown.`;

    const userPrompt = `Optimise ce calendrier de contenu LinkedIn :

MEILLEURS CRÉNEAUX DE PUBLICATION :
${bestTimesStr || 'Non définis'}

CALENDRIER ACTUEL (${calendarItems.length} éléments) :
${itemsSummary}

Réponds avec ce JSON exact :
{
  "optimizedItems": [
    {
      "id": "id_de_l_element",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "topic": "sujet_modifié_ou_identique",
      "format": "format_optimisé",
      "priority": "priorité_optimisée",
      "reason": "raison_du_changement_en_une_phrase"
    }
  ],
  "suggestions": [
    "Suggestion 1: description",
    "Suggestion 2: description"
  ],
  "gaps": [
    { "date": "YYYY-MM-DD", "suggestion": "suggestion de contenu pour combler ce trou" }
  ],
  "stats": {
    "totalItems": nombre,
    "highPriorityCount": nombre,
    "formatDistribution": { "text": n, "image": n, "carousel": n, "poll": n, "article": n, "video": n },
    "coverageScore": "pourcentage de jours couverts",
    "varietyScore": "score de 1 à 10 de la variété des formats"
  }
}`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await callAI(messages, {
      temperature: 0.5,
      maxTokens: 3000,
    });

    let parsed;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      return NextResponse.json(
        { error: "L'IA n'a pas pu optimiser le calendrier" },
        { status: 500 }
      );
    }

    // Apply optimizations to existing items in DB
    const optimizedItems = parsed.optimizedItems || [];
    const updates = [];

    for (const opt of optimizedItems) {
      if (!opt.id) continue;
      try {
        const updated = await db.contentPlanItem.update({
          where: { id: opt.id, userId: authUser.id },
          data: {
            ...(opt.date && { plannedDate: new Date(opt.date) }),
            ...(opt.time && { plannedTime: opt.time }),
            ...(opt.topic && { topic: opt.topic }),
            ...(opt.format && { format: opt.format }),
            ...(opt.priority && { priority: opt.priority }),
          },
        });
        updates.push(updated);
      } catch (err) {
        console.warn('[Calendar Optimize] Failed to update item:', err);
      }
    }

    return NextResponse.json({
      optimizedItems: updates,
      suggestions: parsed.suggestions || [],
      gaps: parsed.gaps || [],
      stats: parsed.stats || {},
      totalOptimized: updates.length,
    });
  } catch (error) {
    console.error('[Content Calendar Optimize] Error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'optimisation du calendrier" },
      { status: 500 }
    );
  }
}
