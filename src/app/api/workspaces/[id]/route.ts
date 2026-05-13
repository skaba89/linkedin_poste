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

    const workspace = await db.workspace.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true, linkedinAccounts: true } },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Espace de travail introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
        members: workspace.members.map((m) => ({
          ...m,
          joinedAt: m.joinedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Workspace GET error:', error);
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

    const { id } = await params;

    const permCheck = await requireWorkspaceMember(id, authUser.id, ['owner', 'admin']);
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const body = await request.json();
    const { name, description, logoUrl } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Le nom doit contenir au moins 2 caractères' },
          { status: 400 }
        );
      }
      data.name = name.trim();
    }
    if (description !== undefined) {
      data.description = description?.trim() || null;
    }
    if (logoUrl !== undefined) {
      data.logoUrl = logoUrl || null;
    }

    const workspace = await db.workspace.update({
      where: { id },
      data,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, linkedinAccounts: true } },
      },
    });

    return NextResponse.json({
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Workspace PATCH error:', error);
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

    const { id } = await params;

    const permCheck = await requireWorkspaceMember(id, authUser.id, ['owner']);
    if (!permCheck.authorized) {
      return NextResponse.json({ error: 'Seul le propriétaire peut supprimer cet espace de travail' }, { status: 403 });
    }

    await db.workspace.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workspace DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
