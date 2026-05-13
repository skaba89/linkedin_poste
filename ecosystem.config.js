/**
 * PM2 Ecosystem Configuration — DataSphere
 *
 * 5 processus:
 *   1. nextjs-app              - Serveur Next.js
 *   2. scheduled-worker        - Publication planifiée (5 min)
 *   3. auto-reply-worker       - Réponse auto commentaires (10 min)
 *   4. mission-scout-worker    - Mission Scout + auto-apply (30 min)
 *   5. all-agents-worker       - 5 agents IA (30 min)
 */

module.exports = {
  apps: [
    // ── Next.js Application ──────────────────────────────────────
    {
      name: 'nextjs-app',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },

    // ── Workers (compiled .js from .ts) ──────────────────────────
    {
      name: 'scheduled-worker',
      script: 'dist/workers/worker-scheduled-publish.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      max_restarts: 10,
      restart_delay: 5000,
    },

    {
      name: 'auto-reply-worker',
      script: 'dist/workers/worker-auto-reply.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      max_restarts: 5,
      restart_delay: 5000,
    },

    {
      name: 'mission-scout-worker',
      script: 'dist/workers/worker-mission-scout.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      max_restarts: 5,
      restart_delay: 5000,
    },

    {
      name: 'all-agents-worker',
      script: 'dist/workers/worker-all-agents.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      max_restarts: 5,
      restart_delay: 5000,
    },
  ],
};
