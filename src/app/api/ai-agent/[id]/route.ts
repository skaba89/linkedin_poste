import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

// PATCH /api/ai-agent/[id] — approve or reject an activity
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
    const body = await request.json();
    const { action } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide. Utilisez "approve" ou "reject".' }, { status: 400 });
    }

    const activity = await db.agentActivity.findUnique({
      where: { id },
    });

    if (!activity || activity.userId !== authUser.id) {
      return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 });
    }

    if (activity.status !== 'pending') {
      return NextResponse.json(
        { error: `Impossible de ${action === 'approve' ? 'approuver' : 'rejeter'} une activité avec le statut "${activity.status}"` },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updated = await db.agentActivity.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({ activity: updated });
  } catch (error) {
    console.error('Agent activity action error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
