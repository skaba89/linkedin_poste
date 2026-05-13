import { db } from '@/lib/db';
import { createHmac } from 'crypto';

// ============================================================
// Types
// ============================================================

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  userId: string;
}

// ============================================================
// Core: triggerWebhooks
// ============================================================

/**
 * Déclenche tous les webhooks actifs d'un utilisateur pour un événement donné.
 * Fire-and-forget : ne bloque pas l'opération principale.
 */
export async function triggerWebhooks(
  userId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const subscriptions = await db.webhookSubscription.findMany({
      where: { userId, isActive: true },
    });

    const matching = subscriptions.filter((sub) => {
      if (!sub.events) return true;
      try {
        const events: string[] = JSON.parse(sub.events);
        return events.includes('*') || events.includes(event);
      } catch {
        return true;
      }
    });

    if (matching.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      userId,
    };

    const payloadStr = JSON.stringify(payload);

    // Fire each webhook in parallel
    await Promise.allSettled(
      matching.map((sub) => deliverWebhook(sub, payload, payloadStr))
    );
  } catch (err) {
    console.error('[Webhook] triggerWebhooks error:', err);
  }
}

// ============================================================
// Delivery
// ============================================================

async function deliverWebhook(
  subscription: {
    id: string;
    url: string;
    secret: string;
  },
  payload: WebhookPayload,
  payloadStr: string
): Promise<void> {
  const signature = computeSignature(subscription.secret, payloadStr);

  const maxAttempts = 2; // 1 initial + 1 retry
  let lastError: string | null = null;
  let lastStatus: number | null = null;
  let success = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Delivery': `${subscription.id}-${Date.now()}`,
          'User-Agent': 'DataSphere-Webhooks/1.0',
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      lastStatus = response.status;

      // 2xx = success
      if (response.status >= 200 && response.status < 300) {
        success = true;
        break;
      }

      // Don't retry on 4xx client errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        lastError = `HTTP ${response.status} — Erreur client, pas de retry`;
        break;
      }

      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Retry on network errors
    }
  }

  // Update subscription stats (fire-and-forget)
  try {
    await db.webhookSubscription.update({
      where: { id: subscription.id },
      data: {
        lastTriggeredAt: new Date(),
        lastStatusCode: lastStatus,
        lastError: success ? null : lastError,
        ...(success
          ? { successCount: { increment: 1 }, lastError: null }
          : { failureCount: { increment: 1 } }),
      },
    });
  } catch {
    // Silent — stats update failure should not affect anything
  }
}

// ============================================================
// HMAC-SHA256 Signature
// ============================================================

/**
 * Calcule la signature HMAC-SHA256 hex d'un payload avec un secret.
 * Compatible avec la vérification côté Zapier/Make/n8n.
 */
export function computeSignature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

// ============================================================
// Test webhook delivery (used by the API test endpoint)
// ============================================================

export async function testWebhookDelivery(
  subscriptionId: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const sub = await db.webhookSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!sub) {
    return { success: false, error: 'Abonnement introuvable' };
  }

  const payload: WebhookPayload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'Ceci est un événement de test depuis DataSphere.',
      subscriptionId: sub.id,
      subscriptionName: sub.name,
    },
    userId: sub.userId,
  };

  const payloadStr = JSON.stringify(payload);
  const signature = computeSignature(sub.secret, payloadStr);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Delivery': `${sub.id}-test-${Date.now()}`,
        'User-Agent': 'DataSphere-Webhooks/1.0',
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const success = response.status >= 200 && response.status < 300;

    await db.webhookSubscription.update({
      where: { id: sub.id },
      data: {
        lastTriggeredAt: new Date(),
        lastStatusCode: response.status,
        ...(success
          ? { successCount: { increment: 1 }, lastError: null }
          : { failureCount: { increment: 1 }, lastError: `HTTP ${response.status}` }),
      },
    });

    return {
      success,
      statusCode: response.status,
      error: success ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Erreur de connexion';

    await db.webhookSubscription.update({
      where: { id: sub.id },
      data: {
        lastTriggeredAt: new Date(),
        lastError: errMsg,
        failureCount: { increment: 1 },
      },
    });

    return { success: false, error: errMsg };
  }
}
