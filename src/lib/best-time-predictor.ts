const DAY_LABELS: Record<number, string> = { 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche' };
const DAY_SHORT: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };

interface SlotData {
  dayOfWeek: number;
  hour: number;
  engagements: number[];
}

export interface TimeRecommendation {
  dayOfWeek: number;
  dayLabel: string;
  hour: number;
  slotLabel: string;
  avgEngagement: number;
  confidence: number;
  totalDataPoints: number;
  rank: number;
}

export interface BestTimeAnalysis {
  topSlots: TimeRecommendation[];
  worstSlots: TimeRecommendation[];
  byDay: { day: string; avgEngagement: number; posts: number }[];
  byHour: { hour: number; avgEngagement: number; posts: number }[];
  patterns: string[];
  recommendation: string;
}

export function analyzeBestTime(
  posts: Array<{ scheduledDate: string; engagementRate: number }>
): BestTimeAnalysis | null {
  if (posts.length < 3) return null;

  const slots: Map<string, SlotData> = new Map();
  const dayTotals: Map<number, { sum: number; count: number }> = new Map();
  const hourTotals: Map<number, { sum: number; count: number }> = new Map();

  for (const post of posts) {
    const date = new Date(post.scheduledDate);
    const dow = date.getDay() === 0 ? 7 : date.getDay();
    const hour = date.getHours();
    const key = `${dow}-${hour}`;

    if (!slots.has(key)) {
      slots.set(key, { dayOfWeek: dow, hour, engagements: [] });
    }
    slots.get(key)!.engagements.push(post.engagementRate);

    const dayData = dayTotals.get(dow) || { sum: 0, count: 0 };
    dayData.sum += post.engagementRate;
    dayData.count += 1;
    dayTotals.set(dow, dayData);

    const hourData = hourTotals.get(hour) || { sum: 0, count: 0 };
    hourData.sum += post.engagementRate;
    hourData.count += 1;
    hourTotals.set(hour, hourData);
  }

  // Build slot recommendations
  const slotEntries: TimeRecommendation[] = [];
  for (const [, data] of slots) {
    if (data.engagements.length < 2) continue;
    const avg = data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length;
    slotEntries.push({
      dayOfWeek: data.dayOfWeek,
      dayLabel: DAY_LABELS[data.dayOfWeek] || `Jour ${data.dayOfWeek}`,
      hour: data.hour,
      slotLabel: `${data.hour}h00`,
      avgEngagement: Math.round(avg * 100) / 100,
      confidence: Math.min(100, data.engagements.length * 10),
      totalDataPoints: data.engagements.length,
      rank: 0,
    });
  }

  slotEntries.sort((a, b) => b.avgEngagement - a.avgEngagement);
  slotEntries.forEach((s, i) => (s.rank = i + 1));

  const topSlots = slotEntries.slice(0, 5);
  const worstSlots = slotEntries.length > 3 ? slotEntries.slice(-3).reverse() : [];

  // By day
  const byDay: BestTimeAnalysis['byDay'] = [];
  const dayOrder = [1, 2, 3, 4, 5, 6, 7];
  for (const d of dayOrder) {
    const data = dayTotals.get(d);
    if (data) {
      byDay.push({ day: DAY_SHORT[d], avgEngagement: Math.round(data.sum / data.count * 100) / 100, posts: data.count });
    }
  }

  // By hour
  const byHour: BestTimeAnalysis['byHour'] = [];
  for (let h = 6; h <= 22; h++) {
    const data = hourTotals.get(h);
    if (data) {
      byHour.push({ hour: h, avgEngagement: Math.round(data.sum / data.count * 100) / 100, posts: data.count });
    }
  }

  // Patterns
  const patterns: string[] = [];
  if (topSlots.length > 0) {
    const bestDayName = DAY_LABELS[topSlots[0].dayOfWeek];
    patterns.push(`Vos posts le ${bestDayName?.toLowerCase()} ${topSlots[0].hour}h performent mieux que la moyenne`);
  }
  if (worstSlots.length > 0) {
    const worstDayName = DAY_LABELS[worstSlots[0].dayOfWeek];
    patterns.push(`Évitez le ${worstDayName?.toLowerCase()} ${worstSlots[0].hour}h (engagement faible)`);
  }

  const bestDayData = [...dayTotals.entries()].sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count));
  if (bestDayData.length > 1) {
    const bestAvg = bestDayData[0][1].sum / bestDayData[0][1].count;
    const worstAvg = bestDayData[bestDayData.length - 1][1].sum / bestDayData[bestDayData.length - 1][1].count;
    if (worstAvg === 0 || bestAvg > worstAvg * 1.5) {
      const diff = worstAvg === 0 ? 100 : Math.round(((bestAvg - worstAvg) / worstAvg) * 100);
      patterns.push(`Le ${DAY_LABELS[bestDayData[0][0]]?.toLowerCase()} a ${diff}% plus d'engagement que votre pire jour`);
    }
  }

  let recommendation = 'Pas assez de données pour une recommandation personnalisée. Publiez le mardi-jeudi entre 8h et 10h.';
  if (topSlots.length >= 2) {
    const t1 = topSlots[0];
    const t2 = topSlots[1];
    if (t1.dayOfWeek === t2.dayOfWeek) {
      recommendation = `Publiez le ${DAY_LABELS[t1.dayOfWeek]?.toLowerCase()} entre ${t1.hour}h et ${t2.hour}h pour maximiser l'engagement.`;
    } else {
      recommendation = `Vos meilleurs créneaux : ${DAY_LABELS[t1.dayOfWeek]?.toLowerCase()} ${t1.hour}h et ${DAY_LABELS[t2.dayOfWeek]?.toLowerCase()} ${t2.hour}h.`;
    }
  }

  return { topSlots, worstSlots, byDay, byHour, patterns, recommendation };
}
