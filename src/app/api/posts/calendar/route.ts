import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const posts = await db.post.findMany({
      where: {
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        aiVariants: { orderBy: { variantIndex: 'asc' }, take: 1 },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Also fetch posts without scheduled date
    const unscheduledPosts = await db.post.findMany({
      where: {
        scheduledDate: null,
        status: { notIn: ['posted', 'failed'] },
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      posts,
      unscheduledPosts,
    });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
