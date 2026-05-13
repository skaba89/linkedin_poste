import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI, AIMessage } from '@/lib/ai-providers';
import { addDays, format, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json();
    const { period = 'week', topics, focus, includeWeekends = false } = body;

    const days = period === 'week' ? 7 : 30;
    const today = new Date();

    // Fetch context data in parallel
    const [postingSlots, brandVoice, contentIdeas] = await Promise.all([
      db.postingSlot.findMany({
        where: { userId: authUser.id },
        orderBy: { avgEngagement: 'desc' },
      }),
      db.brandVoiceProfile.findFirst({
        where: { userId: authUser.id },
      }),
      db.contentIdea.findMany({
        where: { userId: authUser.id, status: 'idea' },
        orderBy: { priority: 'desc', upvotes: 'desc' },
        take: 10,
      }),
    ]);

    // Build best times map by day of week
    const bestTimesByDay: Record<number, string[]> = {};
    for (const slot of postingSlots) {
      if (!bestTimesByDay[slot.dayOfWeek]) bestTimesByDay[slot.dayOfWeek] = [];
      const timeStr = `${String(slot.hour).padStart(2, '0')}:00`;
      if (!bestTimesByDay[slot.dayOfWeek].includes(timeStr)) {
        bestTimesByDay[slot.dayOfWeek].push(timeStr);
      }
    }

    // Build content ideas summary
    const ideasSummary = contentIdeas.length > 0
      ? contentIdeas.map((idea, i) => `${i + 1}. ${idea.title}${idea.suggestedFormat ? ` (${idea.suggestedFormat})` : ''} [${idea.priority}]`).join('\n')
      : 'Aucune idée existante';

    // Build brand voice summary
    const voiceSummary = brandVoice
      ? `Ton: ${brandVoice.tone || 'non défini'}, Vocabulaire: ${brandVoice.vocabulary ? brandVoice.vocabulary.slice(0, 200) : 'non défini'}, Thèmes: ${brandVoice.themes ? brandVoice.themes.slice(0, 200) : 'non défini'}`
      : 'Non défini';

    // Generate dates
    const dates: { date: Date; dayOfWeek: number; isWeekend: boolean }[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i);
      const dow = getDay(d);
      const isWeekend = dow === 0 || dow === 6;
      if (!isWeekend || includeWeekends) {
        dates.push({ date: d, dayOfWeek: dow, isWeekend });
      }
    }

    const dayNamesFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const dateContext = dates.map((d) => {
      const bestTimes = bestTimesByDay[d.dayOfWeek];
      return `- ${format(d.date, 'EEEE dd MMMM yyyy', { locale: fr })} (Jour ${d.dayOfWeek}): meilleur créneau${bestTimes?.length ? ` ${bestTimes.slice(0, 2).join(', ')}` : ' non défini'}`;
    }).join('\n');

    const systemPrompt = `Tu es un expert en stratégie de contenu LinkedIn B2B francophone. Tu crées des calendriers de contenu optimisés pour l'engagement.

Règles :
- Chaque jour doit avoir UN contenu planifié sauf indication contraire
- Alterne les formats pour maintenir l'intérêt (texte, image, carrousel, sondage, article, vidéo)
- Les lundis et mardis sont idéaux pour du contenu éducatif
- Les jeudis et vendredis sont meilleurs pour du contenu engageant/débat
- Le mercredi est idéal pour un carrousel ou article long
- Priorise les idées de contenu existantes quand elles correspondent
- Adapte le ton au profil de marque de l'utilisateur
- Suggère des hashtags pertinents pour chaque post (5-8 hashtags)
- Attribue une priorité réaliste (high/medium/low)
- Suggère un segment d'audience cible pertinent

FORMATS DISPONIBLES : text, image, carousel, poll, article, video
PRIORITÉS DISPONIBLES : high, medium, low
JOURS DE LA SEMAINE : 0=Dimanche, 1=Lundi, ..., 6=Samedi

IMPORTANT: Tu dois répondre UNIQUEMENT avec un JSON valide, sans texte additionnel, sans markdown backticks.`;

    const userPrompt = `Génère un calendrier de contenu LinkedIn pour ${period === 'week' ? '1 semaine' : '1 mois'}.

PROFIL DE MARQUE :
${voiceSummary}

IDÉES DE CONTENU EXISTANTES :
${ideasSummary}

${topics?.length ? `SUJETS DEMANDÉS : ${topics.join(', ')}` : ''}
${focus ? `FOCUS STRATÉGIQUE : ${focus}` : ''}

JOURS À PLANIFIER (${dates.length} jours, ${includeWeekends ? 'weekends inclus' : 'weekends exclus'}):
${dateContext}

Réponds avec un JSON de cette forme exacte :
{
  "items": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "topic": "Sujet du post",
      "format": "text|image|carousel|poll|article|video",
      "audience": "Segment d'audience",
      "priority": "high|medium|low",
      "suggestedHashtags": "#tag1 #tag2 #tag3",
      "aiSuggestion": "Description détaillée de la suggestion de contenu, l'angle à aborder, et pourquoi ce contenu sera pertinent pour l'audience. 2-3 phrases."
    }
  ]
}`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await callAI(messages, {
      temperature: 0.7,
      maxTokens: 4000,
    });

    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from possible markdown blocks
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch {
      return NextResponse.json(
        { error: "L'IA n'a pas pu générer un calendrier valide" },
        { status: 500 }
      );
    }

    // Save generated items to DB
    const items = parsed.items || [];
    const savedItems = [];

    for (const item of items) {
      if (!item.date || !item.topic) continue;

      try {
        const saved = await db.contentPlanItem.create({
          data: {
            userId: authUser.id,
            plannedDate: new Date(item.date),
            plannedTime: item.time || null,
            topic: item.topic,
            format: item.format || 'text',
            audience: item.audience || null,
            priority: item.priority || 'medium',
            status: 'planned',
            suggestedHashtags: item.suggestedHashtags || null,
            aiSuggestion: item.aiSuggestion || null,
          },
        });
        savedItems.push(saved);
      } catch (err) {
        console.warn('[Content Calendar] Failed to save item:', err);
      }
    }

    return NextResponse.json({
      items: savedItems,
      totalGenerated: items.length,
      totalSaved: savedItems.length,
    });
  } catch (error) {
    console.error('[Content Calendar Generate] Error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du calendrier" },
      { status: 500 }
    );
  }
}
