/**
 * Mission Scout Ultra — Background Worker
 * 
 * Runs every 30 minutes to:
 * - Phase 1: Scan for new opportunities (based on user config)
 * - Phase 2: Auto-apply if enabled and under weekly limit
 * - Phase 3: Process follow-ups (J+3, J+7, J+14)
 * - Phase 4: Check for responses to sent applications
 * 
 * Creates AgentActivity entries for each action.
 */

import { db } from '@/lib/db';
import { MissionScoutAgent } from '@/lib/agents/mission-scout';

const WORKER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function runWorker() {
  console.log(`[MissionScout Worker] Starting cycle at ${new Date().toISOString()}`);

  try {
    // Find all users with mission_scout agent enabled
    const enabledConfigs = await db.agentConfig.findMany({
      where: {
        agentType: 'mission_scout',
        enabled: true,
      },
      select: { userId: true },
    });

    console.log(`[MissionScout Worker] Found ${enabledConfigs.length} enabled users`);

    for (const config of enabledConfigs) {
      try {
        const result = await MissionScoutAgent.runWorkerCycle(config.userId);
        console.log(
          `[MissionScout Worker] User ${config.userId}: ` +
          `${result.opportunitiesFound} opps, ${result.applicationsSent} applied, ` +
          `${result.followUpsProcessed} follow-ups, ${result.expired} expired`
        );

        // Create summary activity if anything happened
        if (result.opportunitiesFound > 0 || result.applicationsSent > 0 || result.followUpsProcessed > 0) {
          await db.agentActivity.create({
            data: {
              userId: config.userId,
              agentType: 'mission_scout',
              status: 'completed',
              title: 'Cycle worker Mission Scout terminé',
              description: `${result.opportunitiesFound} opportunités, ${result.applicationsSent} candidatures, ${result.followUpsProcessed} relances, ${result.expired} expirées.`,
              metadata: JSON.stringify(result),
            },
          });
        }
      } catch (error) {
        console.error(`[MissionScout Worker] Error for user ${config.userId}:`, error);
        await db.agentActivity.create({
          data: {
            userId: config.userId,
            agentType: 'mission_scout',
            status: 'failed',
            title: 'Erreur cycle worker Mission Scout',
            result: error instanceof Error ? error.message : 'Erreur inconnue',
          },
        });
      }
    }

    console.log(`[MissionScout Worker] Cycle completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[MissionScout Worker] Fatal error:', error);
  }
}

// Run immediately, then on interval
runWorker();
setInterval(runWorker, WORKER_INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[MissionScout Worker] Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[MissionScout Worker] Interrupted, shutting down...');
  process.exit(0);
});

export { runWorker };
