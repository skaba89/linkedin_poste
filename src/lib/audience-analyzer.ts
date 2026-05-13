const POSITIVE_WORDS = ['merci', 'super', 'excellent', 'génial', '👍', 'bravo', 'intéressant', 'bien', 'parfait', 'top', 'formidable', 'utile', 'partagé', 'inspirant'];
const NEGATIVE_WORDS = ['non', 'pas d\'accord', 'faux', 'décevant', 'bof', 'dommage', 'mauvais', 'problème', 'erreur', 'difficile'];
const PAIN_WORDS = ['problème', 'difficile', 'galère', 'compliqué', 'cher', 'perdre', 'bloqué', 'impossible', 'long', 'lent', 'confus', 'frustré', 'angoisse'];
const INTEREST_WORDS = ['comment', 'pourquoi', 'quel', 'quelle', 'est-ce que', 'conseil', 'recommandation', 'astuce', 'méthode', 'guide'];

function detectSentiment(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('?')) return 'question';
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) return 'positive';
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) return 'negative';
  return 'neutral';
}

export interface AudienceInsight {
  totalComments: number;
  avgCommentsPerPost: number;
  topCommenters: { name: string; count: number }[];
  questions: { question: string; postId: string; frequency: number }[];
  painPoints: { point: string; frequency: number; posts: string[] }[];
  interests: { topic: string; frequency: number }[];
  sentimentDistribution: { positive: number; negative: number; neutral: number; question: number };
  contentIdeas: Array<{
    title: string;
    description: string;
    suggestedFormat: string;
    suggestedAngle: string;
    priority: 'high' | 'medium' | 'low';
    source: string;
    sourcePostId: string;
  }>;
}

export interface AnalyzedComment {
  postId: string;
  authorName?: string;
  content: string;
  likes: number;
  sentiment: string;
}

export function analyzeAudience(comments: AnalyzedComment[]): AudienceInsight {
  const totalComments = comments.length;
  if (totalComments === 0) {
    return {
      totalComments: 0,
      avgCommentsPerPost: 0,
      topCommenters: [],
      questions: [],
      painPoints: [],
      interests: [],
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0, question: 0 },
      contentIdeas: [],
    };
  }
  const postIds = [...new Set(comments.map(c => c.postId))];
  const avgCommentsPerPost = postIds.length > 0 ? totalComments / postIds.length : 0;

  // Top commenters
  const commenterFreq: Map<string, number> = new Map();
  for (const c of comments) {
    if (c.authorName) commenterFreq.set(c.authorName, (commenterFreq.get(c.authorName) || 0) + 1);
  }
  const topCommenters = [...commenterFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

  // Questions
  const questions: Map<string, { question: string; postId: string; frequency: number }> = new Map();
  for (const c of comments) {
    const sentences = c.content.split(/[.!]+/).filter(s => s.includes('?'));
    for (const q of sentences) {
      const clean = q.trim();
      if (clean.length > 5) {
        const key = clean.toLowerCase();
        const existing = questions.get(key);
        if (existing) {
          existing.frequency++;
        } else {
          questions.set(key, { question: clean, postId: c.postId, frequency: 1 });
        }
      }
    }
  }
  const questionList = [...questions.values()].sort((a, b) => b.frequency - a.frequency).slice(0, 15);

  // Pain points
  const painMap: Map<string, { frequency: number; posts: string[] }> = new Map();
  for (const c of comments) {
    const lower = c.content.toLowerCase();
    for (const w of PAIN_WORDS) {
      if (lower.includes(w)) {
        const existing = painMap.get(w);
        if (existing) {
          existing.frequency++;
          if (!existing.posts.includes(c.postId)) existing.posts.push(c.postId);
        } else {
          painMap.set(w, { frequency: 1, posts: [c.postId] });
        }
      }
    }
  }
  const painPoints = [...painMap.entries()].sort((a, b) => b[1].frequency - a[1].frequency).slice(0, 10)
    .map(([point, data]) => ({ point, frequency: data.frequency, posts: data.posts }));

  // Interests
  const interestMap: Map<string, number> = new Map();
  for (const c of comments) {
    const lower = c.content.toLowerCase();
    for (const w of INTEREST_WORDS) {
      if (lower.includes(w)) {
        interestMap.set(w, (interestMap.get(w) || 0) + 1);
      }
    }
  }
  const interests = [...interestMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([topic, frequency]) => ({ topic, frequency }));

  // Sentiment distribution
  let pos = 0, neg = 0, neu = 0, quest = 0;
  for (const c of comments) {
    const s = c.sentiment || detectSentiment(c.content);
    if (s === 'positive') pos++;
    else if (s === 'negative') neg++;
    else if (s === 'question') quest++;
    else neu++;
  }

  // Content ideas
  const contentIdeas: AudienceInsight['contentIdeas'] = [];
  const ideaSet = new Set<string>();
  
  for (const q of questionList.slice(0, 5)) {
    const key = q.question.slice(0, 30);
    if (!ideaSet.has(key)) {
      ideaSet.add(key);
      contentIdeas.push({
        title: `Guide : ${q.question.replace('?', '')}`,
        description: `Répondre à la question fréquente de l'audience`,
        suggestedFormat: 'howto',
        suggestedAngle: `Réponse détaillée basée sur les retours de l'audience`,
        priority: q.frequency >= 3 ? 'high' : q.frequency >= 2 ? 'medium' : 'low',
        source: 'audience_feedback',
        sourcePostId: q.postId,
      });
    }
  }

  for (const p of painPoints.slice(0, 3)) {
    const key = `pain-${p.point}`;
    if (!ideaSet.has(key)) {
      ideaSet.add(key);
      contentIdeas.push({
        title: `Comment résoudre : ${p.point.charAt(0).toUpperCase() + p.point.slice(1)}`,
        description: `Solution pratique pour un problème récurrent soulevé ${p.frequency} fois`,
        suggestedFormat: 'listicle',
        suggestedAngle: `Approche étape par étape pour surmonter ${p.point}`,
        priority: p.frequency >= 3 ? 'high' : 'medium',
        source: 'audience_feedback',
        sourcePostId: p.posts[0] || '',
      });
    }
  }

  for (const i of interests.slice(0, 2)) {
    const key = `interest-${i.topic}`;
    if (!ideaSet.has(key)) {
      ideaSet.add(key);
      contentIdeas.push({
        title: `Deep dive : ${i.topic.charAt(0).toUpperCase() + i.topic.slice(1)}`,
        description: `Exploration approfondie d'un sujet d'intérêt fréquent`,
        suggestedFormat: 'thought_leadership',
        suggestedAngle: `Analyse experte et retours d'expérience sur ${i.topic}`,
        priority: i.frequency >= 3 ? 'high' : 'low',
        source: 'audience_feedback',
        sourcePostId: '',
      });
    }
  }

  return {
    totalComments,
    avgCommentsPerPost: Math.round(avgCommentsPerPost * 10) / 10,
    topCommenters,
    questions: questionList,
    painPoints,
    interests,
    sentimentDistribution: {
      positive: Math.round((pos / totalComments) * 100) / 100,
      negative: Math.round((neg / totalComments) * 100) / 100,
      neutral: Math.round((neu / totalComments) * 100) / 100,
      question: Math.round((quest / totalComments) * 100) / 100,
    },
    contentIdeas,
  };
}
