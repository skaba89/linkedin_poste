import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, aiLimiter } from '@/lib/rate-limit';

/**
 * Auto-score a prospect based on profile data completeness and quality signals.
 * Score factors:
 * - Has LinkedIn URL: +15
 * - Has company: +15
 * - Has title: +15
 * - Has headline: +10
 * - Company is in tech/data/marketing: +10
 * - Title indicates seniority (VP, Director, Head, CTO, CEO): +15
 * - Has notes: +5
 * - Has tags: +5
 * - Has been contacted (status past "new"): +10
 */
function calculateScore(prospect: {
  linkedinUrl: string | null;
  company: string | null;
  title: string | null;
  headline: string | null;
  status: string;
  notes: string | null;
  tags: string | null;
}): number {
  let score = 0;

  if (prospect.linkedinUrl) score += 15;
  if (prospect.company) score += 15;
  if (prospect.title) score += 15;
  if (prospect.headline) score += 10;
  if (prospect.notes) score += 5;
  if (prospect.tags) score += 5;

  // Company industry signals
  const techKeywords = ['tech', 'data', 'ai', 'software', 'saas', 'marketing', 'digital', 'cloud', 'analytics', 'bi'];
  if (prospect.company) {
    const companyLower = prospect.company.toLowerCase();
    if (techKeywords.some(kw => companyLower.includes(kw))) {
      score += 10;
    }
  }

  // Seniority signals in title
  const seniorKeywords = ['vp', 'director', 'head', 'cto', 'ceo', 'cfo', 'coo', 'cmo', 'cdo', 'chief', 'vp ', 'svp', 'evp', 'lead', 'manager', 'senior'];
  if (prospect.title) {
    const titleLower = prospect.title.toLowerCase();
    if (seniorKeywords.some(kw => titleLower.includes(kw))) {
      score += 15;
    }
  }

  // Status engagement bonus
  if (['contacted', 'replied', 'interested', 'converted'].includes(prospect.status)) {
    score += 10;
  }
  if (['interested', 'converted'].includes(prospect.status)) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(aiLimiter, request, `prospects:score:${authUser.id}`);
    if (rlResult) return rlResult;

    const body = await request.json();
    const { prospectId } = body;

    if (!prospectId) {
      return NextResponse.json({ error: 'prospectId requis' }, { status: 400 });
    }

    const prospect = await db.prospect.findFirst({
      where: { id: prospectId, userId: authUser.id },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    const newScore = calculateScore(prospect);

    const updated = await db.prospect.update({
      where: { id: prospectId },
      data: { score: newScore },
    });

    return NextResponse.json({
      prospect: updated,
      previousScore: prospect.score,
      newScore,
    });
  } catch (error) {
    console.error('Prospect score POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
