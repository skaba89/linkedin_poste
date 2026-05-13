/**
 * AllAgents Unified Worker
 *
 * Runs every 30 minutes to process cycles for 5 AI agents:
 *   - ProfileOptimizer  → profile_optimizer
 *   - NetworkBuilder    → network_builder
 *   - ContentRecycler   → content_recycler
 *   - CompetitorSpy     → competitor_spy
 *   - ClientNurture     → client_nurture
 *
 * For each agent type:
 *   1. Find all users with that agent enabled in AgentConfig
 *   2. Call the agent's static runWorkerCycle(userId) method
 *   3. Create a summary AgentActivity if anything happened
 *   4. Record failures gracefully without crashing the loop
 *
 * Usage:
 *   bun run worker-all-agents.ts
 *   pm2 start ecosystem.config.js    (manages Next.js + workers)
 */

import { db } from '@/lib/db';
import { ProfileOptimizerAgent } from '@/lib/agents/profile-optimizer';
import { NetworkBuilderAgent } from '@/lib/agents/network-builder';
import { ContentRecyclerAgent } from '@/lib/agents/content-recycler';
import { CompetitorSpyAgent } from '@/lib/agents/competitor-spy';
import { ClientNurtureAgent } from '@/lib/agents/client-nurture';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentDefinition {
  agentType: string;
  label: string;
  run: (userId: string) => Promise<AgentCycleResult>;
}

interface AgentCycleResult {
  [key: string]: number | string | boolean | undefined;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WORKER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes — same as mission-scout

const AGENTS: AgentDefinition[] = [
  {
    agentType: 'profile_optimizer',
    label: 'Profile Optimizer',
    run: (userId) => ProfileOptimizerAgent.runWorkerCycle(userId),
  },
  {
    agentType: 'network_builder',
    label: 'Network Builder',
    run: (userId) => NetworkBuilderAgent.runWorkerCycle(userId),
  },
  {
    agentType: 'content_recycler',
    label: 'Content Recycler',
    run: (userId) => ContentRecyclerAgent.runWorkerCycle(userId),
  },
  {
    agentType: 'competitor_spy',
    label: 'Competitor Spy',
    run: (userId) => CompetitorSpyAgent.runWorkerCycle(userId),
  },
  {
    agentType: 'client_nurture',
    label: 'Client Nurture',
    run: (userId) => ClientNurtureAgent.runWorkerCycle(userId),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract numeric action counts from a cycle result to decide whether
 * a summary activity should be created.
 */
function hasActionableResult(result: AgentCycleResult): boolean {
  const numericFields = Object.values(result).filter(
    (v) => typeof v === 'number' && v > 0,
  );
  return numericFields.length > 0;
}

/**
 * Build a human-readable one-liner from the cycle result for the
 * AgentActivity description.
 */
function buildResultSummary(result: AgentCycleResult): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'number' && value > 0) {
      // Convert camelCase keys to spaced labels
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
      parts.push(`${value} ${label.toLowerCase()}`);
    }
  }
  return parts.length > 0 ? parts.join(', ') + '.' : 'Aucune action.';
}

// ---------------------------------------------------------------------------
// Core worker logic
// ---------------------------------------------------------------------------

async function runWorker() {
  console.log(`[AllAgents Worker] Starting cycle at ${new Date().toISOString()}`);

  try {
    for (const agent of AGENTS) {
      console.log(`[AllAgents Worker] Processing agent: ${agent.label} (${agent.agentType})`);

      try {
        // 1. Find all users with this agent enabled
        const enabledConfigs = await db.agentConfig.findMany({
          where: {
            agentType: agent.agentType,
            enabled: true,
          },
          select: { userId: true },
        });

        if (enabledConfigs.length === 0) {
          console.log(`[AllAgents Worker] No enabled users for ${agent.label}`);
          continue;
        }

        console.log(
          `[AllAgents Worker] Found ${enabledConfigs.length} enabled user(s) for ${agent.label}`,
        );

        // 2. Process each user
        for (const config of enabledConfigs) {
          try {
            const result = await agent.run(config.userId);
            console.log(
              `[AllAgents Worker] ${agent.label} — User ${config.userId}:`,
              JSON.stringify(result),
            );

            // 3. Create summary activity if anything happened
            if (hasActionableResult(result)) {
              await db.agentActivity.create({
                data: {
                  userId: config.userId,
                  agentType: agent.agentType,
                  status: 'completed',
                  title: `Cycle worker ${agent.label} terminé`,
                  description: buildResultSummary(result),
                  metadata: JSON.stringify(result),
                },
              });
            }

            // 4. Update lastExecutedAt
            await db.agentConfig
              .update({
                where: {
                  userId_agentType: {
                    userId: config.userId,
                    agentType: agent.agentType,
                  },
                },
                data: { lastExecutedAt: new Date() },
              })
              .catch(() => {
                // Config row may not exist yet — ignore
              });
          } catch (error) {
            console.error(
              `[AllAgents Worker] Error for ${agent.label} / user ${config.userId}:`,
              error,
            );

            // Record failure activity
            await db.agentActivity.create({
              data: {
                userId: config.userId,
                agentType: agent.agentType,
                status: 'failed',
                title: `Erreur cycle worker ${agent.label}`,
                result: error instanceof Error ? error.message : 'Erreur inconnue',
              },
            });
          }
        }
      } catch (error) {
        // Per-agent fatal error — don't crash the entire loop
        console.error(
          `[AllAgents Worker] Fatal error for agent ${agent.label}:`,
          error,
        );
      }
    }

    console.log(`[AllAgents Worker] Cycle completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[AllAgents Worker] Fatal error:', error);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

// Run immediately, then on interval
runWorker();
setInterval(runWorker, WORKER_INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[AllAgents Worker] Shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[AllAgents Worker] Interrupted, shutting down...');
  process.exit(0);
});

// Unhandled rejection safety net
process.on('unhandledRejection', (reason) => {
  console.error('[AllAgents Worker] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[AllAgents Worker] Uncaught exception:', err);
});

export { runWorker };
