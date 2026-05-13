import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { requirePermission, clearPermissionCache } from '@/lib/permissions';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/roles/[id] — Get single role with permissions
export async function GET(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const permCheck = await requirePermission(authUser.id, 'users.view');
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const { id } = await context.params;

    const role = await db.role.findUnique({
      where: { id },
      include: {
        permissions: { select: { id: true, name: true, category: true, description: true } },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Role GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/roles/[id] — Update role (admin only)
export async function PATCH(request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const body = await request.json();
    const { name, label, description, isDefault, maxPostsPerMonth, features, permissionIds } = body;

    const existing = await db.role.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 });
    }

    // Prevent renaming to an already-taken name
    if (name && name !== existing.name) {
      const nameTaken = await db.role.findUnique({ where: { name } });
      if (nameTaken) {
        return NextResponse.json({ error: 'Un rôle avec ce nom existe déjà' }, { status: 409 });
      }
    }

    // Update role basic fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);
    if (maxPostsPerMonth !== undefined) updateData.maxPostsPerMonth = maxPostsPerMonth ? Number(maxPostsPerMonth) : null;
    if (features !== undefined) updateData.features = features ? JSON.stringify(features) : null;

    const role = await db.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: { select: { id: true, name: true, category: true } },
        _count: { select: { users: true } },
      },
    });

    // Update permissions if provided
    if (permissionIds && Array.isArray(permissionIds)) {
      // Delete all existing role-permission links
      await db.rolePermission.deleteMany({ where: { roleId: id } });

      // Create new links
      if (permissionIds.length > 0) {
        await db.rolePermission.createMany({
          data: permissionIds.map((permId: string) => ({ roleId: id, permissionId: permId })),
        });
      }

      // Clear permission cache for all users with this role
      const usersWithRole = await db.user.findMany({
        where: { roleId: id },
        select: { id: true },
      });
      for (const u of usersWithRole) {
        clearPermissionCache(u.id);
      }
    }

    // Also update the `role` string on linked users for backward compat if name changed
    if (name && name !== existing.name) {
      await db.user.updateMany({
        where: { roleId: id },
        data: { role: name },
      });
    }

    // Return updated role with fresh permissions
    const updatedRole = await db.role.findUnique({
      where: { id },
      include: {
        permissions: { select: { id: true, name: true, category: true, description: true } },
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({ role: updatedRole });
  } catch (error) {
    console.error('Role PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/roles/[id] — Delete role (admin only, can't delete admin/default roles)
export async function DELETE(request: Request, context: RouteContext) {
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

    const { id } = await context.params;

    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 404 });
    }

    // Prevent deleting the admin role
    if (role.name === 'admin') {
      return NextResponse.json({ error: 'Le rôle administrateur ne peut pas être supprimé' }, { status: 400 });
    }

    // Prevent deleting default roles
    if (role.isDefault) {
      return NextResponse.json({ error: 'Le rôle par défaut ne peut pas être supprimé' }, { status: 400 });
    }

    // Unlink users from this role
    await db.user.updateMany({
      where: { roleId: id },
      data: { roleId: null },
    });

    // Clear permission cache for unlinked users
    const usersWithRole = await db.user.findMany({
      where: { roleId: id },
      select: { id: true },
    });
    for (const u of usersWithRole) {
      clearPermissionCache(u.id);
    }

    await db.role.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Rôle supprimé' });
  } catch (error) {
    console.error('Role DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
