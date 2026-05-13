const STOP_WORDS_FR = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'en',
  'que', 'qui', 'dans', 'ce', 'il', 'ne', 'sur', 'se', 'pas', 'plus',
  'par', 'je', 'avec', 'tout', 'faire', 'son', 'à', 'ou', 'mais', 'si',
  'nous', 'vous', 'ils', 'elle', 'elles', 'ont', 'son', 'sa', 'ses',
  'leur', 'leurs', 'aussi', 'pour', 'sur', 'très', 'bien', 'cette',
  'entre', 'autre', 'comme', 'quand', 'tout', 'ses', 'aux', 'été',
  'peut', 'chaque', 'depuis', 'sans', 'donc', 'ni', 'car', 'rien',
  'donc', 'été', 'être', 'avoir', 'fait', 'est-ce', 'ces', 'mon',
  'mes', 'ton', 'tes', 'notre', 'votre', 'nos', 'vos', 'plusieurs',
  'même', 'aussi', 'encore', 'jamais', 'toujours', 'déjà', 'ici',
  'ainsi', 'alors', 'avant', 'après', 'dès', 'chez', 'dont',
]);

const POSITIVE_WORDS = ['bon', 'excellent', 'réussir', 'opportunité', 'innover', 'transformation', 'bien', 'super', 'génial', 'merveilleux', 'parfait', 'incroyable', 'formidable', 'fantastique', 'bravo', 'merci', 'plaisir', 'passion', 'ambition', 'croissance', 'progrès', 'succès', 'victoire', 'espoir', 'confiance', 'courage', 'audace', 'créativité', 'inspirer', 'motiver', 'enthousiasme', 'énergie', 'dynamique', 'performance', 'excellence', 'qualité', 'valeur', 'impact', 'résultat', 'réalisation', 'accomplissement', 'avantage', 'force', 'puissance'];

const NEGATIVE_WORDS = ['problème', 'échec', 'risque', 'perdre', 'difficile', 'erreurs', 'échouer', 'perdu', 'mauvais', 'pire', 'crise', 'danger', 'menace', 'obstacle', 'échec', 'faute', 'défaut', 'limite', 'manque', 'manquer', 'faible', 'complexité', 'confusion', 'doute', 'peur', 'stress', 'angoisse', 'frustration', 'déception', 'échec', 'problématique'];

export interface BrandVoiceResult {
  tone: { [key: string]: number };
  vocabulary: {
    topWords: { word: string; count: number; tfidf: number }[];
    signaturePhrases: string[];
    avgWordLength: number;
    avgPostLength: number;
    uniqueWordRatio: number;
  };
  structure: {
    avgSentenceLength: number;
    avgParagraphCount: number;
    avgLineBreaksPerPost: number;
    hookPatterns: string[];
    ctaPatterns: string[];
  };
  emotional: {
    positive: number;
    negative: number;
    neutral: number;
    interrogative: number;
    exclamatory: number;
    emojiFrequency: number;
  };
  themes: { name: string; frequency: number; representative: string }[];
  voicePrompt: string;
  recommendations: string[];
}

export function analyzeBrandVoice(posts: string[]): BrandVoiceResult | null {
  if (posts.length < 2) return null;

  const allContent = posts.join('\n\n');
  const totalChars = allContent.length;

  // Tokenize
  const allWords: string[] = [];
  const uniqueWords: Set<string> = new Set();
  let totalWordLength = 0;
  let totalWordCount = 0;

  for (const post of posts) {
    const words = post.toLowerCase().replace(/[^\wàâéèêëïîôùûüÿçæœ\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS_FR.has(w));
    for (const w of words) {
      allWords.push(w);
      uniqueWords.add(w);
      totalWordLength += w.length;
    }
    totalWordCount += words.length;
  }

  const avgWordLength = totalWordCount > 0 ? totalWordLength / totalWordCount : 0;
  const avgPostLength = totalChars / posts.length;
  const uniqueWordRatio = totalWordCount > 0 ? uniqueWords.size / totalWordCount : 0;

  // Word frequency
  const freq: Map<string, number> = new Map();
  for (const w of allWords) freq.set(w, (freq.get(w) || 0) + 1);

  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({
      word,
      count,
      tfidf: Math.round((count / totalWordCount) * 10000) / 100,
    }));

  // Signature phrases (2-3 word combos in >30% of posts)
  const phraseSet = new Set<string>();
  const twoWordPhrases: Map<string, number> = new Map();
  for (const post of posts) {
    const words = post.toLowerCase().replace(/[^\wàâéèêëïîôùûüÿçæœ\s-]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const seen = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (!STOP_WORDS_FR.has(words[i]) && !STOP_WORDS_FR.has(words[i + 1]) && !seen.has(phrase)) {
        twoWordPhrases.set(phrase, (twoWordPhrases.get(phrase) || 0) + 1);
        seen.add(phrase);
      }
    }
  }

  const threshold = posts.length * 0.25;
  for (const [phrase, count] of twoWordPhrases) {
    if (count >= threshold) phraseSet.add(phrase);
  }
  const signaturePhrases = [...phraseSet].slice(0, 8);

  // Tone detection
  let formalScore = 0, friendlyScore = 0, provocativeScore = 0, educationalScore = 0, inspirationalScore = 0;
  const formalIndicators = ['néanmoins', 'en effet', 'conformément', 'cependant', 'par conséquent', 'ainsi', 'en outre', 'notamment'];
  const friendlyIndicators = ['vous', 'on', 'super', 'top', 'génial', '😉', '😊', 'n\'hésitez', 'dites-moi'];
  const provocativeIndicators = ['mais', 'pourtant', 'cependant', 'pourquoi', 'vérité', 'réalité', 'erreur', 'mythe'];
  const educationalIndicators = ['comment', 'pourquoi', 'guide', 'étape', 'conseil', '1.', '2.', '3.', 'premier', 'deuxième'];
  const inspirationalIndicators = ['possible', 'transformer', 'réussir', 'vision', 'futur', 'potentiel', 'audace', 'oser'];

  for (const post of posts) {
    const lower = post.toLowerCase();
    for (const w of formalIndicators) if (lower.includes(w)) formalScore++;
    for (const w of friendlyIndicators) if (lower.includes(w)) friendlyScore++;
    for (const w of provocativeIndicators) if (lower.includes(w)) provocativeScore++;
    for (const w of educationalIndicators) if (lower.includes(w)) educationalScore++;
    for (const w of inspirationalIndicators) if (lower.includes(w)) inspirationalScore++;
  }

  const maxTone = Math.max(formalScore, friendlyScore, provocativeScore, educationalScore, inspirationalScore, 1);
  const tone = {
    formel: Math.round((formalScore / maxTone) * 100),
    amical: Math.round((friendlyScore / maxTone) * 100),
    provocateur: Math.round((provocativeScore / maxTone) * 100),
    educatif: Math.round((educationalScore / maxTone) * 100),
    inspirant: Math.round((inspirationalScore / maxTone) * 100),
  };

  // Structure
  let totalSentences = 0, totalParagraphs = 0, totalLineBreaks = 0;
  const hookPatterns: string[] = [];
  const ctaPatterns: string[] = [];

  for (const post of posts) {
    const sentences = post.split(/[.!?]+/).filter(s => s.trim().length > 0);
    totalSentences += sentences.length;
    totalParagraphs += post.split(/\n\n+/).filter(p => p.trim().length > 0).length;
    totalLineBreaks += (post.match(/\n/g) || []).length;

    const firstLine = post.split('\n').find(l => l.trim().length > 0) || '';
    if (firstLine.includes('?')) hookPatterns.push('Question en accroche');
    if (/\d+/.test(firstLine)) hookPatterns.push('Chiffre en accroche');

    const lastLines = post.split('\n').filter(l => l.trim().length > 0).slice(-2).join(' ');
    if (lastLines.includes('?')) ctaPatterns.push('Question en conclusion');
    if (/contactez|partagez|dites|abonnez/i.test(lastLines)) ctaPatterns.push('CTA explicite');
  }

  const structure = {
    avgSentenceLength: totalSentences > 0 ? Math.round((totalChars / posts.length) / totalSentences * posts.length) : 0,
    avgParagraphCount: Math.round(totalParagraphs / posts.length),
    avgLineBreaksPerPost: Math.round(totalLineBreaks / posts.length),
    hookPatterns: [...new Set(hookPatterns)].slice(0, 5),
    ctaPatterns: [...new Set(ctaPatterns)].slice(0, 5),
  };

  // Emotional
  let posCount = 0, negCount = 0, questionCount = 0, exclCount = 0;
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

  for (const post of posts) {
    const lower = post.toLowerCase();
    for (const w of POSITIVE_WORDS) if (lower.includes(w)) posCount++;
    for (const w of NEGATIVE_WORDS) if (lower.includes(w)) negCount++;
    questionCount += (post.match(/\?/g) || []).length;
    exclCount += (post.match(/!/g) || []).length;
  }

  const totalSentiment = posCount + negCount || 1;
  const emojiCount = (allContent.match(emojiRegex) || []).length;
  const emojiFreq = totalChars > 0 ? (emojiCount / totalChars) * 1000 : 0;

  const emotional = {
    positive: Math.round((posCount / totalSentiment) * 100),
    negative: Math.round((negCount / totalSentiment) * 100),
    neutral: Math.max(0, 100 - Math.round((posCount / totalSentiment) * 100) - Math.round((negCount / totalSentiment) * 100)),
    interrogative: Math.round((questionCount / (questionCount + exclCount || 1)) * 100),
    exclamatory: Math.round((exclCount / (questionCount + exclCount || 1)) * 100),
    emojiFrequency: Math.round(emojiFreq * 100) / 100,
  };

  // Themes
  const themeKeywords: Map<string, number> = new Map();
  const themeExcerpts: Map<string, string> = new Map();

  for (const word of topWords.slice(0, 15)) {
    let count = 0;
    let excerpt = '';
    for (const post of posts) {
      if (post.toLowerCase().includes(word.word)) {
        count++;
        if (!excerpt) excerpt = post.slice(0, 120) + '...';
      }
    }
    if (count >= posts.length * 0.2) {
      themeKeywords.set(word.word, count);
      themeExcerpts.set(word.word, excerpt);
    }
  }

  const themes = [...themeKeywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, frequency]) => ({
      name,
      frequency: Math.round((frequency / posts.length) * 100) / 100,
      representative: themeExcerpts.get(name) || '',
    }));

  // Dominant tone
  const toneEntries = Object.entries(tone).sort((a, b) => b[1] - a[1]);
  const dominantTone = toneEntries[0]?.[0] || 'amical';
  const toneLabel = { formel: 'formel', amical: 'courant', provocateur: 'provocateur', educatif: 'éducatif', inspirant: 'inspirant' };

  // Voice prompt
  const voicePrompt = `Adopte un ton ${toneLabel[dominantTone] || dominantTone}. Utilise un vocabulaire ${toneLabel[dominantTone] || 'courant'}. Tes posts font en moyenne ${Math.round(avgPostLength)} caractères avec ${structure.avgParagraphCount} paragraphes. Structure : commence par ${hookPatterns[0] || 'une accroche percutante'}, utilise des paragraphes aérés, termine par ${ctaPatterns[0] || 'un appel à l\'action'}. Thèmes récurrents : ${themes.slice(0, 3).map(t => t.name).join(', ')}. ${signaturePhrases.length > 0 ? `Expressions favorites : ${signaturePhrases.slice(0, 3).join(', ')}.` : ''} Niveau d'émotion : ${emotional.positive > emotional.negative ? 'positif' : 'nuancé'}.`;

  // Recommendations
  const recommendations: string[] = [];
  if (tone.formel > 70) recommendations.push('Votre ton est très formel. Essayez d\'être plus convivial pour augmenter l\'engagement.');
  if (tone.amical < 30) recommendations.push('Ajoutez plus de questions et d\'adresses directes (vous, on) pour renforcer la proximité.');
  if (avgPostLength < 700) recommendations.push('Vos posts sont courts. Les posts de 800-1500 caractères obtiennent généralement plus d\'engagement.');
  if (emotional.emojiFrequency < 0.5) recommendations.push('Un léger usage d\'emojis peut rendre vos posts plus engageants sans paraître moins professionnel.');
  if (hookPatterns.length === 0) recommendations.push('Travaillez vos accroches : une question ou un chiffre en première ligne booste la lecture.');

  return { tone, vocabulary: { topWords, signaturePhrases, avgWordLength: Math.round(avgWordLength * 10) / 10, avgPostLength: Math.round(avgPostLength), uniqueWordRatio: Math.round(uniqueWordRatio * 100) / 100 }, structure, emotional, themes, voicePrompt, recommendations };
}
