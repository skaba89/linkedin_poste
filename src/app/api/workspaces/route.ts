import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { getUserWorkspaces, generateSlug, ensureUniqueSlug } from '@/lib/workspace';

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const memberships = await getUserWorkspaces(authUser.id);
    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      logoUrl: m.workspace.logoUrl,
      isActive: m.workspace.isActive,
      role: m.role,
      memberCount: m.workspace._count.members,
      linkedinAccountCount: m.workspace._count.linkedinAccounts,
      owner: m.workspace.owner,
      createdAt: m.workspace.createdAt.toISOString(),
    }));

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Workspaces GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, logoUrl } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Le nom de l\'espace de travail doit contenir au moins 2 caractères' },
        { status: 400 }
      );
    }

    const slug = await ensureUniqueSlug(generateSlug(name.trim()));

    const workspace = await db.workspace.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        logoUrl: logoUrl || null,
        ownerUserId: authUser.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, linkedinAccounts: true } },
      },
    });

    // Add the creator as owner member
    await db.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: authUser.id,
        role: 'owner',
      },
    });

    return NextResponse.json(
      {
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          logoUrl: workspace.logoUrl,
          isActive: workspace.isActive,
          role: 'owner',
          memberCount: workspace._count.members,
          linkedinAccountCount: workspace._count.linkedinAccounts,
          owner: workspace.owner,
          createdAt: workspace.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Workspaces POST error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Un espace de travail avec ce nom existe déjà' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
