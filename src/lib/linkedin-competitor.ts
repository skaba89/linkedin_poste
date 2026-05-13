/**
 * LinkedIn Competitor Tracking Integration
 * 
 * Placeholder module for competitor analysis features.
 * LinkedIn does not provide direct competitor tracking APIs,
 * but the following approaches can be used:
 * 
 * APPROACH 1 - Public Profile Scraping:
 *   - Scrape public LinkedIn profiles/posts (check LinkedIn ToS)
 *   - Parse post content, engagement metrics from public pages
 * 
 * APPROACH 2 - LinkedIn Marketing Solutions:
 *   - Use LinkedIn Campaign Manager APIs
 *   - Compare audience overlap and content performance
 * 
 * APPROACH 3 - Manual Tracking:
 *   - Manually input competitor post data
 *   - Track engagement patterns over time
 */

/**
 * detectPostFormat - Analyzes text to detect content format
 */
export function detectPostFormat(text: string): string {
  const lower = text.toLowerCase();
  
  // Listicle: contains digits + specific keywords
  if (/\d/.test(lower) && 
    (lower.includes('signes') || lower.includes('erreurs') || 
     lower.includes('conseils') || lower.includes('étapes') ||
     lower.includes('astuces') || lower.includes('façons') ||
     lower.includes('raisons') || lower.includes('choses'))) {
    return 'listicle';
  }
  
  // Storytelling
  if (lower.includes('histoire') || lower.includes('histoire de') || 
      lower.includes('il y a') || lower.includes('expérience') ||
      lower.includes('jour où') || lower.includes('rappelle quand') ||
      lower.includes('souvenir')) {
    return 'storytelling';
  }
  
  // Controverse
  if ((lower.includes('ne') && lower.includes('pas')) ||
      lower.includes('arrêtez') || lower.includes('erreur') ||
      lower.includes('provocateur') || lower.includes('mythe') ||
      lower.includes('menti') || lower.includes('attention') ||
      lower.includes('danger') || lower.includes('éviter')) {
    return 'controverse';
  }
  
  // How-to
  if (lower.includes('comment') || lower.includes('guide') || 
      lower.includes('étapes') || lower.includes('framework') ||
      lower.includes('méthode') || lower.includes('processus') ||
      lower.includes('apprendre') || lower.includes('tutorial') ||
      lower.includes('tuto')) {
    return 'howto';
  }
  
  // Default: thought leadership
  return 'thought_leadership';
}

/**
 * calculateCompetitorEngagementRate
 * Computes engagement rate: (likes + comments + reposts) / estimated_impressions * 100
 * Since we may not have impressions for competitors, we estimate based on follower count.
 */
export function calculateCompetitorEngagementRate(
  likes: number,
  comments: number,
  reposts: number,
  estimatedImpressions?: number
): number | null {
  const totalEngagement = likes + comments + reposts;
  if (totalEngagement === 0) return null;

  if (!estimatedImpressions || estimatedImpressions === 0) {
    // Cannot reliably estimate without impressions data
    return null;
  }
  
  return parseFloat(((totalEngagement / estimatedImpressions) * 100).toFixed(2));
}

/**
 * generateCompetitorInsights
 * Analyzes competitor data to generate actionable insights
 */
export function generateCompetitorInsights(
  yourAvgEngagement: number,
  competitorAvgEngagements: { name: string; avgEngagement: number }[],
  yourFormats: Record<string, number>,
  competitorFormats: Record<string, number>
): string[] {
  const insights: string[] = [];
  
  // Engagement comparison
  const bestCompetitor = competitorAvgEngagements
    .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];
  
  if (bestCompetitor && bestCompetitor.avgEngagement > yourAvgEngagement) {
    const ratio = (bestCompetitor.avgEngagement / yourAvgEngagement).toFixed(1);
    insights.push(
      `${bestCompetitor.name} a un engagement ${ratio}x supérieur au vôtre (${bestCompetitor.avgEngagement.toFixed(1)}% vs ${yourAvgEngagement.toFixed(1)}%)`
    );
  } else if (yourAvgEngagement > 0) {
    insights.push(
      `Votre engagement moyen (${yourAvgEngagement.toFixed(1)}%) est supérieur à celui de vos concurrents`
    );
  }
  
  // Format gap analysis
  const allFormats = new Set([...Object.keys(yourFormats), ...Object.keys(competitorFormats)]);
  for (const format of allFormats) {
    const yours = yourFormats[format] || 0;
    const theirs = competitorFormats[format] || 0;
    if (theirs > yours * 1.5 && yours > 0) {
      insights.push(
        `Vos concurrents publient significativement plus de contenu "${format}" que vous`
      );
    }
  }
  
  return insights;
}
