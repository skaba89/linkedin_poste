import { scoreContent } from './content-scorer';

interface CalibrationRecord {
  delta: number;
  factors: {
    lengthScore: number;
    hookScore: number;
    ctaScore: number;
    hashtagScore: number;
    readabilityScore: number;
    emojiScore: number;
  };
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  length: 20 / 85,
  hook: 15 / 85,
  cta: 15 / 85,
  hashtags: 10 / 85,
  readability: 15 / 85,
  emoji: 10 / 85,
};

function computeWeightAdjustments(calibrations: CalibrationRecord[]): Record<string, number> {
  if (calibrations.length < 3) return { ...DEFAULT_WEIGHTS };

  const factorDeltas: Record<string, number[]> = {
    length: [],
    hook: [],
    cta: [],
    hashtags: [],
    readability: [],
    emoji: [],
  };

  for (const cal of calibrations) {
    const factorKeys = Object.keys(cal.factors) as (keyof typeof cal.factors)[];
    for (const key of factorKeys) {
      const factorScore = cal.factors[key];
      const k = key as string;
      const maxPossible = k === 'length' ? 20 : k === 'hook' || k === 'cta' || k === 'readability' ? 15 : 10;
      const normalizedFactor = factorScore / maxPossible;
      
      if (normalizedFactor > 0.7 && cal.delta > 5) {
        factorDeltas[key].push(cal.delta);
      } else if (normalizedFactor < 0.3 && cal.delta < -5) {
        factorDeltas[key].push(cal.delta);
      }
    }
  }

  const adjustedWeights: Record<string, number> = { ...DEFAULT_WEIGHTS };
  const factorNameMap: Record<string, string> = {
    length: 'length',
    hook: 'hook',
    cta: 'cta',
    hashtags: 'hashtags',
    readability: 'readability',
    emoji: 'emoji',
  };

  for (const [key, deltas] of Object.entries(factorDeltas)) {
    if (deltas.length < 2) continue;
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const adjustment = Math.max(-0.05, Math.min(0.05, avgDelta / 500));
    adjustedWeights[factorNameMap[key]] = Math.max(0.05, DEFAULT_WEIGHTS[factorNameMap[key]] + adjustment);
  }

  const totalWeight = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(adjustedWeights)) {
    adjustedWeights[key] /= totalWeight;
  }

  return adjustedWeights;
}

function getImpact(weight: number, factorScore: number): 'high' | 'medium' | 'low' {
  const maxScore = 1.0;
  if (weight * maxScore > 0.15) return 'high';
  if (weight * maxScore > 0.08) return 'medium';
  return 'low';
}

export interface SmartScoreResult {
  rawScore: number;
  calibratedScore: number;
  confidence: number;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    impact: 'high' | 'medium' | 'low';
    tip: string;
  }>;
  recommendations: string[];
}

export function computeSmartScore(
  content: string,
  calibrations: CalibrationRecord[]
): SmartScoreResult {
  const raw = scoreContent(content);
  const weights = computeWeightAdjustments(calibrations);

  const factorMap: Record<string, { key: string; maxScore: number; tipLow: string }> = {
    length: {
      key: 'length',
      maxScore: 20,
      tipLow: 'Votre post est trop court. Les posts de 800-1500 caractères performent mieux sur LinkedIn',
    },
    hook: {
      key: 'hook',
      maxScore: 15,
      tipLow: 'Votre accroche est faible. Les posts avec une question ou un chiffre choc en première ligne performent 2.5x mieux',
    },
    cta: {
      key: 'cta',
      maxScore: 15,
      tipLow: 'Ajoutez un CTA clair. Les posts avec CTA ont 40% plus d\'engagement',
    },
    hashtags: {
      key: 'hashtags',
      maxScore: 10,
      tipLow: 'Ajoutez 3-5 hashtags pertinents pour augmenter la découvrabilité',
    },
    readability: {
      key: 'readability',
      maxScore: 15,
      tipLow: 'Améliorez la lisibilité. Utilisez des paragraphes courts et un espacement aéré',
    },
    emoji: {
      key: 'emoji',
      maxScore: 10,
      tipLow: 'Réduisez les emojis. Un usage modéré (1-3) est perçu comme plus professionnel',
    },
  };

  const factorScores: Record<string, number> = {
    length: raw.breakdown.lengthScore,
    hook: raw.breakdown.hookScore,
    cta: raw.breakdown.ctaScore,
    hashtags: raw.breakdown.hashtagScore,
    readability: raw.breakdown.readabilityScore,
    emoji: raw.breakdown.emojiScore,
  };

  let calibratedTotal = 0;
  const factors: Array<{ name: string; score: number; weight: number; impact: 'high' | 'medium' | 'low'; tip: string }> = [];

  for (const [name, info] of Object.entries(factorMap)) {
    const score = factorScores[info.key];
    const normalizedScore = score / info.maxScore;
    const weight = weights[info.key];
    calibratedTotal += normalizedScore * weight * 100;

    factors.push({
      name,
      score: Math.round(normalizedScore * 100),
      weight: Math.round(weight * 100),
      impact: getImpact(weight, normalizedScore),
      tip: normalizedScore < 0.5 ? info.tipLow : `Bon score ${name} (${Math.round(normalizedScore * 100)}%)`,
    });
  }

  const calibratedScore = Math.min(100, Math.max(0, Math.round(calibratedTotal)));
  const confidence = calibrations.length > 20 ? 85 : calibrations.length > 10 ? 60 : calibrations.length > 3 ? 35 : 10;

  const recommendations: string[] = [];
  for (const f of factors) {
    if (f.score < 50 && f.impact !== 'low') {
      recommendations.push(f.tip);
    }
  }

  if (content.length < 500) {
    recommendations.push('Votre post est trop court. Visez 800-1500 caractères pour un impact optimal');
  }
  if (!content.includes('?') && !content.includes('!')) {
    recommendations.push('Ajoutez une question ou une exclamation pour plus d\'impact émotionnel');
  }

  return {
    rawScore: raw.score,
    calibratedScore,
    confidence,
    factors,
    recommendations: [...new Set(recommendations)],
  };
}
