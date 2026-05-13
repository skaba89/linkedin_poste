import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Fetch all comments from user's posts
    const userPosts = await db.post.findMany({
      where: { authorId: authUser.id },
      select: { id: true, subject: true },
    });

    const postIds = userPosts.map((p) => p.id);

    if (postIds.length === 0) {
      return NextResponse.json({
        overallSentiment: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
        sentimentTrend: [],
        topPositiveComments: [],
        topNegativeComments: [],
        emotionBreakdown: [],
        keywordCloud: [],
        postSentimentMap: [],
        totalAnalyzed: 0,
        avgScore: 0,
      });
    }

    const comments = await db.audienceComment.findMany({
      where: { postId: { in: postIds } },
      orderBy: { collectedAt: 'desc' },
    });

    // Filter to last N days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filteredComments = comments.filter(
      (c) => new Date(c.collectedAt) >= cutoff,
    );

    // ---- Overall sentiment ----
    const overallSentiment = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    for (const c of comments) {
      const s = c.sentiment?.toLowerCase() || 'neutral';
      if (s === 'positive') overallSentiment.positive++;
      else if (s === 'negative') overallSentiment.negative++;
      else if (s === 'mixed') overallSentiment.mixed++;
      else overallSentiment.neutral++;
    }

    // ---- Sentiment trend (daily) ----
    const dayMap: Record<
      string,
      { positive: number; negative: number; neutral: number; mixed: number }
    > = {};
    for (const c of filteredComments) {
      const day = new Date(c.collectedAt).toISOString().split('T')[0];
      if (!dayMap[day]) dayMap[day] = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
      const s = c.sentiment?.toLowerCase() || 'neutral';
      if (s === 'positive') dayMap[day].positive++;
      else if (s === 'negative') dayMap[day].negative++;
      else if (s === 'mixed') dayMap[day].mixed++;
      else dayMap[day].neutral++;
    }

    const sentimentTrend = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // ---- Top positive/negative comments ----
    const analyzedComments = comments.filter((c) => c.sentiment);
    const positiveComments = analyzedComments
      .filter((c) => c.sentiment === 'positive')
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        content: c.content,
        authorName: c.authorName,
        collectedAt: c.collectedAt,
      }));

    const negativeComments = analyzedComments
      .filter((c) => c.sentiment === 'negative')
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        content: c.content,
        authorName: c.authorName,
        collectedAt: c.collectedAt,
      }));

    // ---- Emotion breakdown ----
    // Derived from sentiment + content analysis (heuristic since we don't store emotions yet)
    const emotionMap: Record<string, number> = {
      joie: 0,
      confiance: 0,
      surprise: 0,
      colère: 0,
      tristesse: 0,
      peur: 0,
    };

    const POSITIVE_EMOTIONS: Record<string, string> = {
      'merci': 'joie', 'super': 'joie', 'excellent': 'joie', 'génial': 'joie',
      'bravo': 'joie', 'formidable': 'joie', 'inspirant': 'joie',
      'intéressant': 'confiance', 'utile': 'confiance', 'bien': 'confiance',
      'parfait': 'confiance', 'partagé': 'confiance', 'd\'accord': 'confiance',
      'wow': 'surprise', 'incroyable': 'surprise', 'étonnant': 'surprise',
    };

    const NEGATIVE_EMOTIONS: Record<string, string> = {
      'non': 'colère', 'pas d\'accord': 'colère', 'faux': 'colère',
      'mauvais': 'colère', 'décevant': 'tristesse', 'dommage': 'tristesse',
      'bof': 'tristesse', 'problème': 'peur', 'erreur': 'peur',
      'difficile': 'peur', 'impossible': 'peur', 'frustré': 'colère',
    };

    for (const c of comments) {
      const lower = c.content.toLowerCase();

      for (const [word, emotion] of Object.entries(POSITIVE_EMOTIONS)) {
        if (lower.includes(word)) emotionMap[emotion]++;
      }
      for (const [word, emotion] of Object.entries(NEGATIVE_EMOTIONS)) {
        if (lower.includes(word)) emotionMap[emotion]++;
      }
    }

    const emotionBreakdown = Object.entries(emotionMap).map(([name, count]) => ({
      name,
      count,
    }));

    // ---- Keyword cloud ----
    const keywordFreq: Record<string, { count: number; context: 'positive' | 'negative' | 'neutral' }> = {};

    // Extract meaningful keywords from comments (words >= 4 chars)
    const STOP_WORDS = new Set([
      'avec', 'cette', 'dans', 'elle', 'fait', 'mais', 'nous', 'pour',
      'plus', 'quel', 'sont', 'tout', 'vous', 'été', 'this', 'that',
      'very', 'have', 'been', 'they', 'them', 'their', 'about', 'would',
      'there', 'from', 'which', 'when', 'what', 'your', 'were', 'each',
      'also', 'into', 'other', 'than', 'some', 'could', 'time', 'just',
      'plus', 'tres', 'bien', 'cest', 'quel', 'pour', 'avec', 'elle',
      'nous', 'mais', 'tout', 'vous', 'fait', 'aussi', 'comme', 'donc',
      'ete', 'apres', 'avant', 'deja', 'entre', 'alors', 'ici', 'cela',
    ]);

    for (const c of comments) {
      const words = c.content
        .toLowerCase()
        .replace(/[^a-zàâäéèêëïîôùûüÿçœæ\s-]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

      for (const w of words) {
        if (!keywordFreq[w]) {
          keywordFreq[w] = { count: 0, context: 'neutral' };
        }
        keywordFreq[w].count++;
        if (c.sentiment === 'positive') keywordFreq[w].context = 'positive';
        else if (c.sentiment === 'negative') keywordFreq[w].context = 'negative';
      }
    }

    const keywordCloud = Object.entries(keywordFreq)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([word, data]) => ({
        word,
        count: data.count,
        context: data.context,
      }));

    // ---- Post sentiment map ----
    const postCommentCounts: Record<string, { total: number; positive: number; negative: number; neutral: number; mixed: number }> = {};
    for (const c of comments) {
      if (!postCommentCounts[c.postId]) {
        postCommentCounts[c.postId] = { total: 0, positive: 0, negative: 0, neutral: 0, mixed: 0 };
      }
      postCommentCounts[c.postId].total++;
      const s = c.sentiment?.toLowerCase() || 'neutral';
      if (s in postCommentCounts[c.postId]) postCommentCounts[c.postId][s as keyof typeof postCommentCounts[string]]++;
    }

    const postMap = userPosts.map((p) => {
      const data = postCommentCounts[p.id];
      if (!data || data.total === 0) {
        return {
          postId: p.id,
          title: p.subject,
          avgSentiment: null,
          commentCount: 0,
          score: 0,
        };
      }
      const score = Math.round(((data.positive + 0.5 * data.neutral) / data.total) * 100);
      const sentimentLabel =
        data.positive / data.total > 0.6 ? 'positive' :
        data.negative / data.total > 0.4 ? 'negative' :
        data.positive > data.negative ? 'léger positif' :
        data.negative > data.positive ? 'léger négatif' : 'neutre';

      return {
        postId: p.id,
        title: p.subject,
        avgSentiment: sentimentLabel,
        commentCount: data.total,
        score,
        distribution: {
          positive: data.positive,
          negative: data.negative,
          neutral: data.neutral,
          mixed: data.mixed,
        },
      };
    });

    // Sort by comment count descending
    postMap.sort((a, b) => b.commentCount - a.commentCount);

    // ---- Active alerts count ----
    const activeAlerts = await db.sentimentAlert.count({
      where: { userId: authUser.id, isEnabled: true },
    });

    // ---- Average score ----
    const totalAnalyzed = analyzedComments.length;
    const positiveCount = analyzedComments.filter((c) => c.sentiment === 'positive').length;
    const avgScore = totalAnalyzed > 0 ? Math.round((positiveCount / totalAnalyzed) * 100) : 0;

    return NextResponse.json({
      overallSentiment,
      sentimentTrend,
      topPositiveComments: positiveComments,
      topNegativeComments: negativeComments,
      emotionBreakdown,
      keywordCloud,
      postSentimentMap: postMap,
      totalAnalyzed,
      avgScore,
      activeAlerts,
    });
  } catch (error) {
    console.error('Sentiment dashboard error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
