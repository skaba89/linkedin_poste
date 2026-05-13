import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { rateLimitMiddleware, apiLimiter } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const rlResult = await rateLimitMiddleware(apiLimiter, request, `search:${authUser.id}`);
    if (rlResult) return rlResult;

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const type = searchParams.get('type') || 'all';

    if (!query) {
      return NextResponse.json({
        posts: [],
        prospects: [],
        competitors: [],
        opportunities: [],
        agentActivities: [],
        total: 0,
      });
    }

    const searchCondition = {
      contains: query,
      mode: 'insensitive' as const,
    };

    const results: {
      posts: unknown[];
      prospects: unknown[];
      competitors: unknown[];
      opportunities: unknown[];
      agentActivities: unknown[];
    } = {
      posts: [],
      prospects: [],
      competitors: [],
      opportunities: [],
      agentActivities: [],
    };

    const fetchPromises: Promise<void>[] = [];

    // Search Posts
    if (type === 'all' || type === 'posts') {
      fetchPromises.push(
        db.post
          .findMany({
            where: {
              authorId: authUser.id,
              OR: [
                { subject: searchCondition },
                { finalContent: searchCondition },
                { angle: searchCondition },
              ],
            },
            select: {
              id: true,
              subject: true,
              status: true,
              aiProvider: true,
              contentScore: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
          .then((posts) => {
            results.posts = posts.map((p) => ({
              ...p,
              _type: 'post' as const,
              _label: 'Post',
            }));
          })
      );
    }

    // Search Prospects
    if (type === 'all' || type === 'prospects') {
      fetchPromises.push(
        db.prospect
          .findMany({
            where: {
              userId: authUser.id,
              isActive: true,
              OR: [
                { fullName: searchCondition },
                { company: searchCondition },
                { headline: searchCondition },
                { title: searchCondition },
              ],
            },
            select: {
              id: true,
              fullName: true,
              company: true,
              title: true,
              status: true,
              score: true,
              lastContactedAt: true,
              createdAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
          .then((prospects) => {
            results.prospects = prospects.map((p) => ({
              ...p,
              _type: 'prospect' as const,
              _label: 'Prospect',
            }));
          })
      );
    }

    // Search Competitors
    if (type === 'all' || type === 'competitors') {
      fetchPromises.push(
        db.competitor
          .findMany({
            where: {
              userId: authUser.id,
              isActive: true,
              OR: [
                { name: searchCondition },
                { industry: searchCondition },
                { notes: searchCondition },
              ],
            },
            select: {
              id: true,
              name: true,
              linkedinUrl: true,
              industry: true,
              isActive: true,
              lastSyncedAt: true,
              createdAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
          .then((competitors) => {
            results.competitors = competitors.map((c) => ({
              ...c,
              _type: 'competitor' as const,
              _label: 'Concurrent',
            }));
          })
      );
    }

    // Search Opportunities (Mission Scout)
    if (type === 'all' || type === 'opportunities') {
      fetchPromises.push(
        db.opportunity
          .findMany({
            where: {
              userId: authUser.id,
              OR: [
                { title: searchCondition },
                { company: searchCondition },
                { description: searchCondition },
                { sector: searchCondition },
              ],
            },
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              status: true,
              relevanceScore: true,
              source: true,
              createdAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
          .then((opportunities) => {
            results.opportunities = opportunities.map((o) => ({
              ...o,
              _type: 'opportunity' as const,
              _label: 'Opportunité',
            }));
          })
      );
    }

    // Search Agent Activities
    if (type === 'all' || type === 'agentActivities') {
      fetchPromises.push(
        db.agentActivity
          .findMany({
            where: {
              userId: authUser.id,
              OR: [
                { title: searchCondition },
                { description: searchCondition },
                { agentType: searchCondition },
              ],
            },
            select: {
              id: true,
              agentType: true,
              status: true,
              title: true,
              description: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
          .then((activities) => {
            results.agentActivities = activities.map((a) => ({
              ...a,
              _type: 'agentActivity' as const,
              _label: 'Activité Agent',
            }));
          })
      );
    }

    await Promise.all(fetchPromises);

    const total =
      results.posts.length +
      results.prospects.length +
      results.competitors.length +
      results.opportunities.length +
      results.agentActivities.length;

    return NextResponse.json({
      ...results,
      query,
      total,
    });
  } catch (error) {
    console.error('Search GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
