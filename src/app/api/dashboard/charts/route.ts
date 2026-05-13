import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // --- Parse date range from query params ---
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    defaultFrom.setHours(0, 0, 0, 0);

    const fromDate = fromParam ? new Date(fromParam + 'T00:00:00') : defaultFrom;
    const toDate = toParam ? new Date(toParam + 'T23:59:59') : now;

    // Validate dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: 'Dates invalides. Utilisez le format YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // --- Compute week boundaries based on the date range ---
    const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const numWeeks = Math.max(1, Math.min(Math.ceil(rangeDays / 7), 12));

    const weekBoundaries: { start: Date; end: Date; label: string }[] = [];
    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(toDate);
      weekStart.setDate(toDate.getDate() - toDate.getDay() + 1 - i * 7);
      // Clamp to fromDate
      if (weekStart < fromDate) {
        weekStart.setTime(fromDate.getTime());
      }
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      // Clamp to toDate + 1
      if (weekEnd > toDate) {
        weekEnd.setDate(toDate.getDate() + 1);
      }

      weekBoundaries.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      });
    }

    // --- Monthly boundaries for performance ---
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // --- Batch queries with date filters ---
    const eightWeeksAgo = weekBoundaries[0]?.start || fromDate;

    const [
      postsInRange,
      statusDistribution,
      thisMonthPosts,
      lastMonthPosts,
      recentActivity,
      publishedPosts,
      pendingApproval,
    ] = await Promise.all([
      // All posts created in the date range window
      db.post.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true, status: true, updatedAt: true },
      }),
      // Status distribution via groupBy (global, not date-filtered — shows current state)
      db.post.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Posts this month (within date range)
      db.post.count({
        where: {
          createdAt: { gte: thisMonthStart, lte: toDate },
        },
      }),
      // Posts last month
      db.post.count({
        where: {
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
      }),
      // Recent activity (within date range)
      db.auditLog.findMany({
        take: 10,
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      // Published posts for avg time calc (within date range, last 3 months max)
      db.post.findMany({
        where: {
          status: 'posted',
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: { createdAt: true, updatedAt: true },
      }),
      // Pending approval posts (current state, not date-filtered)
      db.post.findMany({
        where: { status: 'pending_approval' },
        take: 5,
        include: { author: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // --- Compute weekly data in-memory from postsInRange ---
    const weeklyData = weekBoundaries.map((wb) => {
      const created = postsInRange.filter(
        (p) => p.createdAt >= wb.start && p.createdAt < wb.end
      ).length;
      const published = postsInRange.filter(
        (p) => p.status === 'posted' && p.updatedAt >= wb.start && p.updatedAt < wb.end
      ).length;
      return { week: wb.label, created, published };
    });

    // --- Status distribution formatting ---
    const statusData = statusDistribution.map((item) => ({
      status: item.status,
      count: item._count,
    }));

    // --- Avg time from creation to publication ---
    let avgTimeHours: number | null = null;
    if (publishedPosts.length > 0) {
      const totalHours = publishedPosts.reduce((sum, p) => {
        const diff = new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgTimeHours = Math.round(totalHours / publishedPosts.length);
    }

    return NextResponse.json({
      weeklyData,
      statusDistribution: statusData,
      recentActivity,
      performance: {
        thisMonthPosts,
        lastMonthPosts,
        monthChange: lastMonthPosts > 0
          ? Math.round(((thisMonthPosts - lastMonthPosts) / lastMonthPosts) * 100)
          : thisMonthPosts > 0 ? 100 : 0,
        avgTimeHours,
      },
      pendingApproval,
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
