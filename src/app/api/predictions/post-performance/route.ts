import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { callAI } from '@/lib/ai-providers';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { content, scheduledDate, format, hashtags } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    // ============================================================
    // 1. Analyze content structure
    // ============================================================
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const bulletPoints = (content.match(/^[\s]*[-•*·]\s/gm) || []).length;
    const questions = (content.match(/\?/g) || []).length;
    const emojis = (content.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu) || []).length;
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const charCount = content.length;
    const hashtagCount = hashtags ? hashtags.split(/[\s,]+/).filter(h => h.startsWith('#')).length : 0;

    // Content score factors
    let structureScore = 0;
    if (paragraphs.length >= 3 && paragraphs.length <= 8) structureScore += 20;
    else if (paragraphs.length >= 2) structureScore += 10;
    if (bulletPoints > 0 && bulletPoints <= 10) structureScore += 15;
    if (questions >= 1 && questions <= 3) structureScore += 15;
    if (emojis >= 1 && emojis <= 4) structureScore += 10;
    else if (emojis > 4) structureScore -= 5;
    if (wordCount >= 50 && wordCount <= 300) structureScore += 15;
    else if (wordCount >= 300 && wordCount <= 500) structureScore += 10;
    if (hashtagCount >= 3 && hashtagCount <= 6) structureScore += 15;
    else if (hashtagCount > 6) structureScore -= 5;
    else if (hashtagCount > 0) structureScore += 5;

    const hasHook = /[\?!.]$/.test(paragraphs[0]?.trim().split('\n')[0] || '');
    if (hasHook) structureScore += 10;

    const structureScoreClamped = Math.max(0, Math.min(100, structureScore));

    // ============================================================
    // 2. Check PostingSlot for best times
    // ============================================================
    let timeScore = 50; // neutral baseline
    let bestSlotDay = '';
    let bestSlotHour = '';
    let bestSlotScore = 0;

    const postingSlots = await db.postingSlot.findMany({
      where: { userId: authUser.id },
      orderBy: { avgEngagement: 'desc' },
      take: 10,
    });

    if (postingSlots.length > 0) {
      const bestSlot = postingSlots[0];
      bestSlotScore = bestSlot.avgEngagement;
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      bestSlotDay = dayNames[bestSlot.dayOfWeek] || `Jour ${bestSlot.dayOfWeek}`;
      bestSlotHour = `${bestSlot.hour}h`;

      if (scheduledDate) {
        const scheduled = new Date(scheduledDate);
        const schedDay = scheduled.getDay();
        const schedHour = scheduled.getHours();

        const matchingSlot = postingSlots.find(
          s => s.dayOfWeek === schedDay && Math.abs(s.hour - schedHour) <= 1
        );
        if (matchingSlot) {
          timeScore = 50 + (matchingSlot.avgEngagement / (postingSlots[0].avgEngagement || 1)) * 50;
        }
      }
    }

    // ============================================================
    // 3. Historical performance of similar content
    // ============================================================
    let historicalScore = 50;
    let historicalAvgEngagement = 0;
    let historicalAvgImpressions = 0;
    let historicalAvgLikes = 0;
    let historicalAvgComments = 0;

    const allMetrics = await db.postMetric.findMany({
      include: { post: { select: { hashtags: true, finalContent: true, subject: true } } },
      orderBy: { collectedAt: 'desc' },
      take: 50,
    });

    if (allMetrics.length > 0) {
      const totalEng = allMetrics.reduce((s, m) => s + m.engagementRate, 0);
      const totalImp = allMetrics.reduce((s, m) => s + m.impressions, 0);
      const totalLikes = allMetrics.reduce((s, m) => s + m.likes, 0);
      const totalComments = allMetrics.reduce((s, m) => s + m.comments, 0);

      historicalAvgEngagement = totalEng / allMetrics.length;
      historicalAvgImpressions = totalImp / allMetrics.length;
      historicalAvgLikes = totalLikes / allMetrics.length;
      historicalAvgComments = totalComments / allMetrics.length;

      // Check format similarity
      if (format && allMetrics.length > 0) {
        const similarPosts = allMetrics.filter(m => {
          const postContent = m.post.finalContent || m.post.subject || '';
          const postLen = postContent.length;
          const currentLen = charCount;
          const lenRatio = Math.min(postLen, currentLen) / Math.max(postLen, currentLen);
          return lenRatio > 0.5;
        });

        if (similarPosts.length >= 2) {
          const simAvg = similarPosts.reduce((s, m) => s + m.engagementRate, 0) / similarPosts.length;
          historicalScore = Math.min(100, 50 + (simAvg / historicalAvgEngagement) * 25);
        }
      }
    }

    // ============================================================
    // 4. ScoringCalibration accuracy
    // ============================================================
    const calibrations = await db.scoringCalibration.findMany({
      orderBy: { calibratedAt: 'desc' },
      take: 20,
    });

    let calibrationDelta = 0;
    let confidence = 0.5;

    if (calibrations.length > 0) {
      calibrationDelta = calibrations.reduce((s, c) => s + Math.abs(c.delta), 0) / calibrations.length;
      // Lower delta = higher confidence, capped between 0.3 and 0.95
      confidence = Math.max(0.3, Math.min(0.95, 1 - (calibrationDelta / 50)));
    }

    // ============================================================
    // 5. AI-enhanced prediction
    // ============================================================
    let aiTips: string[] = [];
    try {
      const aiResult = await callAI(
        [
          {
            role: 'system',
            content: `Tu es un expert en analyse de contenu LinkedIn. Tu analyses des posts LinkedIn et fournis des prédictions de performance et des conseils d'optimisation. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.`
          },
          {
            role: 'user',
            content: `Analyse ce post LinkedIn et donne une prédiction de performance.
Format: ${format || 'non spécifié'}
Hashtags: ${hashtags || 'aucun'}
Longueur: ${charCount} caractères, ${wordCount} mots
Paragraphes: ${paragraphs.length}
Questions: ${questions}
Émojis: ${emojis}
Points: ${bulletPoints}
Performance historique moyenne: ${historicalAvgEngagement.toFixed(2)}% engagement, ${Math.round(historicalAvgImpressions)} impressions

Réponds en JSON avec cette structure exacte:
{
  "tips": ["conseil 1", "conseil 2", "conseil 3"],
  "contentQualityScore": <nombre 0-100>,
  "estimatedBoost": <facteur multiplicatif 0.8-2.0>
}`
          },
        ],
        { temperature: 0.3, maxTokens: 300 },
        'zai'
      );

      const parsed = JSON.parse(aiResult.replace(/```json\n?|\n?```/g, '').trim());
      if (parsed.tips && Array.isArray(parsed.tips)) {
        aiTips = parsed.tips.slice(0, 5);
      }
    } catch {
      aiTips = [];
    }

    // ============================================================
    // 6. Combine all scores into final prediction
    // ============================================================
    const combinedScore = Math.round(
      structureScore * 0.35 +
      timeScore * 0.2 +
      historicalScore * 0.3 +
      (calibrations.length > 0 ? (100 - calibrationDelta) * 0.15 : 50 * 0.15)
    );

    // Predict metrics based on historical averages and score
    const scoreFactor = combinedScore / 70; // 70 = average expected score
    const predictedEngagement = parseFloat(
      (historicalAvgEngagement * scoreFactor * (0.85 + confidence * 0.3)).toFixed(2)
    );
    const predictedImpressions = Math.round(
      historicalAvgImpressions * scoreFactor * (0.85 + confidence * 0.3)
    );
    const predictedLikes = Math.round(
      historicalAvgLikes * scoreFactor * (0.85 + confidence * 0.3)
    );
    const predictedComments = Math.round(
      historicalAvgComments * scoreFactor * (0.85 + confidence * 0.3)
    );

    // Default tips if AI didn't provide any
    if (aiTips.length === 0) {
      if (paragraphs.length < 3) aiTips.push('Ajoutez plus de paragraphes courts pour améliorer la lisibilité.');
      if (questions === 0) aiTips.push('Posez une question pour encourager l\'engagement.');
      if (emojis === 0) aiTips.push('1-2 émojis peuvent augmenter la visibilité.');
      if (wordCount < 50) aiTips.push('Enrichissez le contenu pour plus de valeur.');
      if (hashtagCount < 3) aiTips.push('Ajoutez 3-5 hashtags pertinents.');
      if (aiTips.length === 0) aiTips.push('Le contenu semble bien structuré.');
    }

    return NextResponse.json({
      predictedEngagement,
      predictedImpressions,
      predictedLikes,
      predictedComments,
      score: combinedScore,
      tips: aiTips,
      confidence: parseFloat(confidence.toFixed(2)),
      bestSlot: postingSlots.length > 0 ? { day: bestSlotDay, hour: bestSlotHour, score: bestSlotScore } : null,
    });
  } catch (error) {
    console.error('Prediction post-performance error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
