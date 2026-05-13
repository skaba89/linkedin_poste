import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { requireWorkspaceMember } from '@/lib/workspace';

const WORKSPACE_COOKIE = 'lp_workspace_id';

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

    const permCheck = await requireWorkspaceMember(id, authUser.id);
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    // Get workspace details
    const workspace = await db.workspace.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        isActive: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Espace de travail introuvable' }, { status: 404 });
    }

    // Set cookie and return
    const response = NextResponse.json({
      workspace,
    });

    response.cookies.set(WORKSPACE_COOKIE, id, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Workspace switch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
