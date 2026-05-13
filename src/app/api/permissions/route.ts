import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { requirePermission } from '@/lib/permissions';

// GET /api/permissions — List all permissions grouped by category
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const permCheck = await requirePermission(authUser.id, 'users.view');
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const permissions = await db.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const byCategory: Record<string, { id: string; name: string; description: string | null }[]> = {};
    for (const perm of permissions) {
      if (!byCategory[perm.category]) byCategory[perm.category] = [];
      byCategory[perm.category].push({
        id: perm.id,
        name: perm.name,
        description: perm.description,
      });
    }

    return NextResponse.json({ permissions, byCategory });
  } catch (error) {
    console.error('Permissions GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
