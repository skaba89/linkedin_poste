import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { requireWorkspaceMember } from '@/lib/workspace';
import type { WorkspaceMemberRole } from '@/lib/workspace';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const permCheck = await requireWorkspaceMember(id, authUser.id);
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const members = await db.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        isActive: m.user.isActive,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Workspace members GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const permCheck = await requireWorkspaceMember(id, authUser.id, ['owner', 'admin']);
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const validRoles: WorkspaceMemberRole[] = ['admin', 'member', 'viewer'];
    const memberRole = role || 'member';
    if (!validRoles.includes(memberRole)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    // Find user by email
    const targetUser = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Aucun utilisateur trouvé avec cet email' }, { status: 404 });
    }

    if (!targetUser.isActive) {
      return NextResponse.json({ error: 'Cet utilisateur est désactivé' }, { status: 400 });
    }

    // Check if already a member
    const existing = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: id, userId: targetUser.id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Cet utilisateur est déjà membre de cet espace' }, { status: 409 });
    }

    const member = await db.workspaceMember.create({
      data: {
        workspaceId: id,
        userId: targetUser.id,
        role: memberRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
      },
    });

    return NextResponse.json(
      {
        member: {
          id: member.id,
          userId: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl,
          isActive: member.user.isActive,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Workspace members POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const permCheck = await requireWorkspaceMember(workspaceId, authUser.id, ['owner', 'admin']);
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json({ error: 'ID membre et rôle requis' }, { status: 400 });
    }

    const validRoles: WorkspaceMemberRole[] = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    // Find the membership
    const membership = await db.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    // Prevent changing owner role unless the user is the owner
    if (membership.role === 'owner' && role !== 'owner') {
      // Check if the current user is the owner
      const currentUserMembership = await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: authUser.id },
        },
      });
      if (currentUserMembership?.role !== 'owner') {
        return NextResponse.json(
          { error: 'Seul le propriétaire peut modifier le rôle du propriétaire' },
          { status: 403 }
        );
      }
    }

    // Prevent non-owners from assigning 'owner' role
    if (role === 'owner') {
      const currentUserMembership = await db.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: authUser.id },
        },
      });
      if (currentUserMembership?.role !== 'owner') {
        return NextResponse.json(
          { error: 'Seul le propriétaire peut attribuer le rôle de propriétaire' },
          { status: 403 }
        );
      }
    }

    const updated = await db.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
      },
    });

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        avatarUrl: updated.user.avatarUrl,
        isActive: updated.user.isActive,
        role: updated.role,
        joinedAt: updated.joinedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Workspace members PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const permCheck = await requireWorkspaceMember(workspaceId, authUser.id, ['owner', 'admin']);
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'ID membre requis' }, { status: 400 });
    }

    // Find the membership
    const membership = await db.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    // Cannot remove the owner
    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: 'Le propriétaire ne peut pas être supprimé. Transférez la propriété d\'abord.' },
        { status: 400 }
      );
    }

    // Non-owners cannot remove other non-owners (only owner can remove anyone)
    const currentUserMembership = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: authUser.id },
      },
    });

    if (currentUserMembership?.role === 'admin' && membership.role === 'admin') {
      return NextResponse.json(
        { error: 'Un administrateur ne peut pas supprimer un autre administrateur' },
        { status: 403 }
      );
    }

    await db.workspaceMember.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workspace members DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
