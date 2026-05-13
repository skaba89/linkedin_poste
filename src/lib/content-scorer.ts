interface ScoreBreakdown {
  lengthScore: number;
  lengthDetails: string;
  hookScore: number;
  hookDetails: string;
  ctaScore: number;
  ctaDetails: string;
  hashtagScore: number;
  hashtagDetails: string;
  readabilityScore: number;
  readabilityDetails: string;
  emojiScore: number;
  emojiDetails: string;
  totalScore: number;
}

function scoreLength(content: string): { score: number; details: string } {
  const len = content.length;
  if (len >= 800 && len <= 2000) {
    return { score: 20, details: `Longueur idéale (${len} caractères, entre 800 et 2000)` };
  }
  if (len >= 500 && len < 800) {
    return { score: 12, details: `Un peu court (${len} caractères, idéal: 800-2000)` };
  }
  if (len > 2000 && len <= 3000) {
    return { score: 14, details: `Un peu long (${len} caractères, idéal: 800-2000)` };
  }
  if (len >= 300) {
    return { score: 8, details: `Trop court ou trop long (${len} caractères)` };
  }
  return { score: 3, details: `Beaucoup trop court (${len} caractères)` };
}

function scoreHook(content: string): { score: number; details: string } {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { score: 0, details: 'Pas de contenu' };

  const firstLines = lines.slice(0, 2).join(' ').trim();
  const firstLineLength = firstLines.length;

  // Hook indicators
  let indicators = 0;
  const hookPatterns = [
    /\?/, // Question
    /!/i, // Exclamation
    /\d+/, // Numbers
    /%/i, // Percentage
    /(pourquoi|comment|quel|quand|où|est-ce que|avez-vous|savez-vous)/i, // Question words
    /(secret|conseil|erreur|réalité|vérité|astuce|méthode)/i, // Hook words
    /(jamais|toujours|rien|tout)/i, // Absolute words
  ];

  for (const pattern of hookPatterns) {
    if (pattern.test(firstLines)) indicators++;
  }

  // Short first line is good
  if (firstLineLength <= 80) indicators += 1;
  if (firstLineLength <= 50) indicators += 1;

  const score = Math.min(15, Math.round((indicators / 8) * 15));

  const details = indicators >= 5
    ? `Hook puissant détecté (${indicators} indicateurs)`
    : indicators >= 3
      ? `Hook correct (${indicators} indicateurs)`
      : `Hook faible (${indicators} indicateurs)`;

  return { score, details };
}

function scoreCTA(content: string): { score: number; details: string } {
  const ctaPatterns = [
    /(?:quel est votre avis|partagez|commentez|réagissez|dites-le-moi|et vous\?|votre expérience)/i,
    /(?:abonnez-vous|suivez|contactez|cliquez|lien|bio)/i,
    /(?:DM|mp|message)/i,
    /(?:\?+\s*$)/m, // Question at end
  ];

  let found = 0;
  let matched: string[] = [];
  for (const pattern of ctaPatterns) {
    if (pattern.test(content)) {
      found++;
      matched.push(pattern.source.substring(0, 20));
    }
  }

  // Check last 3 lines for CTA
  const lastLines = content.split('\n').slice(-3).join(' ').toLowerCase();
  if (ctaPatterns.some((p) => p.test(lastLines))) found += 1;

  const score = found >= 2 ? 15 : found === 1 ? 10 : 3;
  const details = found >= 2
    ? `CTA clair présent (${found} indicateurs)`
    : found === 1
      ? 'CTA partiellement présent'
      : 'Pas de CTA détecté';

  return { score, details };
}

function scoreHashtags(content: string): { score: number; details: string } {
  const hashtagMatches = content.match(/#[\wÀ-ÿ]+/g) || [];
  const count = hashtagMatches.length;

  if (count >= 3 && count <= 5) {
    return { score: 10, details: `Nombre idéal de hashtags (${count})` };
  }
  if (count >= 1 && count < 3) {
    return { score: 6, details: `Peu de hashtags (${count}, idéal: 3-5)` };
  }
  if (count > 5 && count <= 8) {
    return { score: 6, details: `Trop de hashtags (${count}, idéal: 3-5)` };
  }
  if (count > 8) {
    return { score: 2, details: `Beaucoup trop de hashtags (${count})` };
  }
  return { score: 2, details: 'Aucun hashtag' };
}

function scoreReadability(content: string): { score: number; details: string } {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { score: 0, details: 'Pas de contenu' };

  // Short paragraphs are good for LinkedIn
  const longLines = lines.filter((l) => l.trim().length > 120);
  const shortLines = lines.filter((l) => l.trim().length <= 80);

  // Empty lines between content (white space)
  const totalLines = content.split('\n').length;
  const emptyLines = content.split('\n').filter((l) => l.trim().length === 0).length;
  const spacingRatio = emptyLines / totalLines;

  let score = 10;

  if (longLines.length > lines.length * 0.3) {
    score -= 4;
  } else if (longLines.length > lines.length * 0.1) {
    score -= 2;
  }

  if (shortLines.length >= lines.length * 0.5) {
    score += 2;
  }

  if (spacingRatio >= 0.2 && spacingRatio <= 0.4) {
    score += 2;
  } else if (spacingRatio < 0.1) {
    score -= 3;
  }

  score = Math.max(0, Math.min(15, score));

  const details = score >= 12
    ? 'Très bonne lisibilité (paragraphes courts, bon espacement)'
    : score >= 8
      ? 'Lisibilité correcte'
      : 'Lisibilité faible (paragraphes trop longs, peu d\'espacement)';

  return { score, details };
}

function scoreEmoji(content: string): { score: number; details: string } {
  // Count emojis using unicode ranges
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  const emojis = content.match(emojiRegex) || [];
  const count = emojis.length;

  if (count >= 1 && count <= 4) {
    return { score: 10, details: `Usage modéré et approprié d'émojis (${count})` };
  }
  if (count === 0) {
    return { score: 7, details: "Pas d'émoji (acceptable pour un post B2B)" };
  }
  if (count > 4 && count <= 8) {
    return { score: 4, details: `Quelques émojis de trop (${count}, idéal: 1-4)` };
  }
  return { score: 1, details: `Trop d'émojis (${count})` };
}

export function scoreContent(content: string): { score: number; details: string; breakdown: ScoreBreakdown } {
  if (!content || content.trim().length === 0) {
    const zeroBreakdown: ScoreBreakdown = {
      lengthScore: 0, lengthDetails: 'Pas de contenu',
      hookScore: 0, hookDetails: 'Pas de contenu',
      ctaScore: 0, ctaDetails: 'Pas de contenu',
      hashtagScore: 0, hashtagDetails: 'Pas de contenu',
      readabilityScore: 0, readabilityDetails: 'Pas de contenu',
      emojiScore: 0, emojiDetails: 'Pas de contenu',
      totalScore: 0,
    };
    return { score: 0, details: 'Pas de contenu à évaluer', breakdown: zeroBreakdown };
  }

  const length = scoreLength(content);
  const hook = scoreHook(content);
  const cta = scoreCTA(content);
  const hashtag = scoreHashtags(content);
  const readability = scoreReadability(content);
  const emoji = scoreEmoji(content);

  const totalScore = length.score + hook.score + cta.score + hashtag.score + readability.score + emoji.score;

  const breakdown: ScoreBreakdown = {
    lengthScore: length.score,
    lengthDetails: length.details,
    hookScore: hook.score,
    hookDetails: hook.details,
    ctaScore: cta.score,
    ctaDetails: cta.details,
    hashtagScore: hashtag.score,
    hashtagDetails: hashtag.details,
    readabilityScore: readability.score,
    readabilityDetails: readability.details,
    emojiScore: emoji.score,
    emojiDetails: emoji.details,
    totalScore,
  };

  const detailsText = [
    `Longueur: ${length.details} (${length.score}/20)`,
    `Hook: ${hook.details} (${hook.score}/15)`,
    `CTA: ${cta.details} (${cta.score}/15)`,
    `Hashtags: ${hashtag.details} (${hashtag.score}/10)`,
    `Lisibilite: ${readability.details} (${readability.score}/15)`,
    `Emojis: ${emoji.details} (${emoji.score}/10)`,
    '',
    `Total: ${totalScore}/85 -> ${(totalScore / 85 * 100).toFixed(0)}%`,
  ].join('\n');

  return {
    score: Math.round((totalScore / 85) * 100),
    details: detailsText,
    breakdown,
  };
}
