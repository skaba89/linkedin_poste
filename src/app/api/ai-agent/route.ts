import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';

const VALID_AGENT_TYPES = [
  'content_creator',
  'mission_scout',
  'outreach_manager',
  'engagement_bot',
  'analytics_reporter',
  'profile_optimizer',
  'network_builder',
  'content_recycler',
  'competitor_spy',
  'client_nurture',
  'expert_engagement',
];

const AGENT_TITLES: Record<string, string> = {
  content_creator: 'Génération de contenu',
  mission_scout: 'Surveillance des tendances',
  outreach_manager: 'Campagne de prospection',
  engagement_bot: 'Analyse des commentaires',
  analytics_reporter: 'Rapport de performance',
  profile_optimizer: 'Optimisation du profil',
  network_builder: 'Construction du réseau',
  content_recycler: 'Recyclage de contenu',
  competitor_spy: 'Espionnage concurrentiel',
  client_nurture: 'Nurture des clients',
  expert_engagement: 'Posture experte',
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  content_creator: 'L\'agent va analyser vos tendances et générer du contenu optimisé pour votre audience.',
  mission_scout: 'L\'agent va surveiller les tendances LinkedIn et identifier les opportunités de contenu.',
  outreach_manager: 'L\'agent va préparer une campagne de prospection ciblée basée sur vos critères.',
  engagement_bot: 'L\'agent va analyser les commentaires récents et suggérer des réponses.',
  analytics_reporter: 'L\'agent va compiler vos métriques et générer un rapport de performance.',
  profile_optimizer: 'L\'agent va analyser votre profil LinkedIn et suggérer des optimisations pour améliorer votre visibilité.',
  network_builder: 'L\'agent va identifier de nouvelles cibles de connexion pertinentes et générer des messages personnalisés.',
  content_recycler: 'L\'agent va identifier vos contenus recyclables et générer de nouvelles versions dans différents formats.',
  competitor_spy: 'L\'agent va analyser vos concurrents et détecter les opportunités de différenciation.',
  client_nurture: 'L\'agent va identifier vos clients froids et proposer des actions de réactivation personnalisées.',
  expert_engagement: 'L\'agent va scanner des posts tendances en Data, IA, Cloud, DevOps, Cyber et générer des commentaires experts pour votre posture.',
};

// GET /api/ai-agent — list agent activities
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const activities = await db.agentActivity.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Agent activities fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/ai-agent — launch a new agent (create pending activity)
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { agentType } = body;

    if (!agentType || !VALID_AGENT_TYPES.includes(agentType)) {
      return NextResponse.json({ error: 'Type d\'agent invalide' }, { status: 400 });
    }

    // Check if agent is enabled
    const config = await db.agentConfig.findUnique({
      where: { userId_agentType: { userId: authUser.id, agentType } },
    });

    if (config && !config.enabled) {
      return NextResponse.json({ error: 'Cet agent est désactivé. Activez-le dans la configuration.' }, { status: 400 });
    }

    // Create a pending activity
    const activity = await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType,
        status: 'pending',
        title: AGENT_TITLES[agentType] || `Tâche ${agentType}`,
        description: AGENT_DESCRIPTIONS[agentType] || '',
        metadata: JSON.stringify({ launchedBy: 'user' }),
      },
    });

    // If auto-approve is enabled, immediately approve
    const globalAutoApproveSetting = await db.settings.findUnique({
      where: { key: 'globalAutoApprove' },
    });
    const globalAutoApprove = globalAutoApproveSetting?.value === 'true';
    const agentAutoApprove = config?.autoApprove ?? false;

    if (globalAutoApprove || agentAutoApprove) {
      await db.agentActivity.update({
        where: { id: activity.id },
        data: {
          status: 'approved',
          metadata: JSON.stringify({
            launchedBy: 'user',
            autoApproved: true,
            reason: agentAutoApprove ? 'agent_config' : 'global_setting',
          }),
        },
      });

      activity.status = 'approved';
    }

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Agent launch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
