import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { requirePermission } from '@/lib/permissions';

const ALL_AGENT_TYPES = [
  'content_creator',
  'mission_scout',
  'outreach_manager',
  'engagement_bot',
  'analytics_reporter',
];

// GET /api/ai-agent/config — return all agent configs + globalAutoApprove
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch all agent configs for this user
    const configs = await db.agentConfig.findMany({
      where: { userId: authUser.id },
    });

    // Ensure all agent types have a config row
    const existingTypes = new Set(configs.map((c) => c.agentType));
    const missingTypes = ALL_AGENT_TYPES.filter((t) => !existingTypes.has(t));

    if (missingTypes.length > 0) {
      const newConfigs = await Promise.all(
        missingTypes.map((agentType) =>
          db.agentConfig.create({
            data: { userId: authUser.id, agentType },
          })
        )
      );
      configs.push(...newConfigs);
    }

    // Get global auto-approve setting
    const setting = await db.settings.findUnique({
      where: { key: 'globalAutoApprove' },
    });
    const globalAutoApprove = setting?.value === 'true';

    const agents = configs.map((c) => ({
      agentType: c.agentType,
      enabled: c.enabled,
      autoApprove: c.autoApprove,
      frequency: c.frequency,
      lastExecutedAt: c.lastExecutedAt?.toISOString() || undefined,
    }));

    return NextResponse.json({ agents, globalAutoApprove });
  } catch (error) {
    console.error('Agent config fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/ai-agent/config — save agent config or globalAutoApprove
export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const permCheck = await requirePermission(authUser.id, 'agents.configure');
    if (!permCheck.authorized) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const body = await request.json();
    const { agentType, globalAutoApprove, enabled, autoApprove, frequency } = body;

    // Handle global auto-approve setting
    if (globalAutoApprove !== undefined) {
      await db.settings.upsert({
        where: { key: 'globalAutoApprove' },
        update: { value: String(globalAutoApprove) },
        create: { key: 'globalAutoApprove', value: String(globalAutoApprove) },
      });

      return NextResponse.json({ success: true, globalAutoApprove: Boolean(globalAutoApprove) });
    }

    // Handle per-agent config
    if (!agentType || !ALL_AGENT_TYPES.includes(agentType)) {
      return NextResponse.json({ error: 'Type d\'agent invalide' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (autoApprove !== undefined) updateData.autoApprove = autoApprove;
    if (frequency !== undefined) updateData.frequency = frequency;

    const config = await db.agentConfig.upsert({
      where: { userId_agentType: { userId: authUser.id, agentType } },
      update: updateData,
      create: {
        userId: authUser.id,
        agentType,
        ...updateData,
      },
    });

    return NextResponse.json({
      agentType: config.agentType,
      enabled: config.enabled,
      autoApprove: config.autoApprove,
      frequency: config.frequency,
      lastExecutedAt: config.lastExecutedAt?.toISOString() || undefined,
    });
  } catch (error) {
    console.error('Agent config save error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
