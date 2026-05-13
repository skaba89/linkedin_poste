import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { requirePermission } from '@/lib/permissions';
import { seedRolesAndPermissions } from '@/lib/seed-roles';

// GET /api/roles — List all roles with permissions
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

    const roles = await db.role.findMany({
      include: {
        permissions: { select: { id: true, name: true, category: true, description: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group permissions by category for each role
    const rolesWithGroupedPerms = roles.map((role) => {
      const grouped: Record<string, { id: string; name: string; description: string | null }[]> = {};
      for (const perm of role.permissions) {
        if (!grouped[perm.category]) grouped[perm.category] = [];
        grouped[perm.category].push({
          id: perm.id,
          name: perm.name,
          description: perm.description,
        });
      }
      return {
        id: role.id,
        name: role.name,
        label: role.label,
        description: role.description,
        isDefault: role.isDefault,
        maxPostsPerMonth: role.maxPostsPerMonth,
        features: role.features,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        userCount: role._count.users,
        permissionCount: role.permissions.length,
        permissions: role.permissions,
        permissionsByCategory: grouped,
      };
    });

    return NextResponse.json({ roles: rolesWithGroupedPerms });
  } catch (error) {
    console.error('Roles GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/roles — Create new role (admin only)
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    const permCheck = await requirePermission(authUser.id, 'users.manage');
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const body = await request.json();
    const { name, label, description, isDefault, maxPostsPerMonth, features, permissionIds } = body;

    if (!name || !label) {
      return NextResponse.json({ error: 'Nom et libellé du rôle requis' }, { status: 400 });
    }

    // Check if role name already exists
    const existing = await db.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Un rôle avec ce nom existe déjà' }, { status: 409 });
    }

    // Validate permission IDs if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      const validPerms = await db.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });
      const validIds = new Set(validPerms.map((p) => p.id));
      const invalidIds = permissionIds.filter((id: string) => !validIds.has(id));
      if (invalidIds.length > 0) {
        return NextResponse.json({ error: 'Certains IDs de permissions sont invalides' }, { status: 400 });
      }
    }

    const role = await db.role.create({
      data: {
        name,
        label,
        description: description || null,
        isDefault: Boolean(isDefault),
        maxPostsPerMonth: maxPostsPerMonth ? Number(maxPostsPerMonth) : null,
        features: features ? JSON.stringify(features) : null,
        rolePermissions: permissionIds && Array.isArray(permissionIds)
          ? {
              create: permissionIds.map((id: string) => ({ permissionId: id })),
            }
          : undefined,
      },
      include: {
        permissions: { select: { id: true, name: true, category: true } },
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('Roles POST error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Un rôle avec ce nom existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/roles/seed — Seed default roles & permissions
export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    const result = await seedRolesAndPermissions();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Roles seed error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
