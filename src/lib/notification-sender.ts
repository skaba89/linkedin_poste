import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendRealEmail, buildNotificationHtml } from '@/lib/email';

// ============================================================
// Types
// ============================================================

export interface NotificationPayload {
  userId: string;
  eventType: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
}

interface ChannelConfig {
  email?: string;
  botToken?: string;
  telegramBotToken?: string;
  chatId?: string;
  telegramChatId?: string;
  phoneNumber?: string;
  whatsappPhone?: string;
  whatsappApiKey?: string;
  whatsappProvider?: string; // "callmebot" (default)
  [key: string]: unknown;
}

// ============================================================
// Core Function: sendNotification
// ============================================================

export async function sendNotification(payload: NotificationPayload): Promise<{
  sent: number;
  failed: number;
  channels: { channel: string; label: string | null; success: boolean; error?: string }[];
}> {
  const results: { channel: string; label: string | null; success: boolean; error?: string }[] = [];

  try {
    const channels = await db.notificationChannel.findMany({
      where: { userId: payload.userId, isEnabled: true },
    });

    if (channels.length === 0) {
      console.log(`[Notification] No enabled channels for user ${payload.userId}`);
      await createInAppNotification(payload);
      return { sent: 0, failed: 0, channels: [] };
    }

    const matchingChannels = channels.filter((ch) => {
      if (!ch.events) return true;
      try {
        const events: string[] = JSON.parse(ch.events);
        return events.includes(payload.eventType) || events.includes('*');
      } catch {
        return true;
      }
    });

    for (const ch of matchingChannels) {
      let config: ChannelConfig = {};
      try {
        config = ch.config ? JSON.parse(ch.config) : {};
      } catch {
        console.warn(`[Notification] Invalid config JSON for channel ${ch.id}`);
      }

      let success = false;
      let error: string | undefined;

      try {
        switch (ch.channel) {
          case 'email':
            success = await sendEmail(config.email || '', payload);
            break;
          case 'telegram':
            success = await sendTelegram(
              config.botToken || config.telegramBotToken || '',
              config.chatId || config.telegramChatId || '',
              payload
            );
            break;
          case 'whatsapp':
            success = await sendWhatsApp(config, payload);
            break;
          default:
            console.warn(`[Notification] Unknown channel type: ${ch.channel}`);
            error = 'Unknown channel type';
        }
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error(`[Notification] Failed to send via ${ch.channel}:`, error);
      }

      await db.notificationChannel.update({
        where: { id: ch.id },
        data: {
          lastUsedAt: new Date(),
          ...(error ? { lastError: error } : { lastError: null }),
        },
      });

      results.push({ channel: ch.channel, label: ch.label, success, error });
    }

    await createInAppNotification(payload);
  } catch (err) {
    console.error('[Notification] sendNotification error:', err);
    try { await createInAppNotification(payload); } catch { /* silent */ }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  return { sent, failed, channels: results };
}

// ============================================================
// In-App Notification
// ============================================================

async function createInAppNotification(payload: NotificationPayload) {
  await createNotification({
    userId: payload.userId,
    type: payload.eventType,
    title: payload.title,
    message: payload.message,
    actionUrl: payload.actionUrl,
    metadata: payload.metadata,
  });
}

// ============================================================
// Channel: Email
// ============================================================

async function sendEmail(to: string, payload: NotificationPayload): Promise<boolean> {
  if (!to || !to.includes('@')) throw new Error('Adresse e-mail invalide');

  const priorityEmoji = payload.priority === 'high' ? '🔴' : payload.priority === 'low' ? '🔵' : '🟡';

  const htmlBlock = buildNotificationHtml({
    title: payload.title,
    message: payload.message,
    priorityEmoji,
    actionUrl: payload.actionUrl,
    actionLabel: 'Voir / Approuver',
  });

  const textContent = `${priorityEmoji} ${payload.title}\n\n${payload.message}${payload.actionUrl ? `\n\n👉 Voir : ${payload.actionUrl}` : ''}\n\n— DataSphere`;

  const result = await sendRealEmail({
    to,
    subject: `${priorityEmoji} [DataSphere] ${payload.title}`,
    html: htmlBlock,
    text: textContent,
  });

  if (!result.success) {
    throw new Error(result.error || 'Échec de l\'envoi de l\'e-mail');
  }

  return true;
}

// ============================================================
// Channel: Telegram
// ============================================================

async function sendTelegram(botToken: string, chatId: string, payload: NotificationPayload): Promise<boolean> {
  if (!botToken || !chatId) throw new Error('Telegram bot token and chat ID are required');

  const priorityEmoji = payload.priority === 'high' ? '🔴' : payload.priority === 'low' ? '🔵' : '🟡';
  let text = `<b>${priorityEmoji} ${escapeHtml(payload.title)}</b>\n\n${escapeHtml(payload.message)}\n\n`;
  if (payload.actionUrl) text += `<a href="${escapeHtml(payload.actionUrl)}">👉 Voir / Approuver</a>\n`;
  text += `\n<i>— AI SaaS Agent</i>`;

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.description || `Telegram API error: ${response.status}`);
  console.log(`[Telegram] Sent to chat ${chatId}, message_id: ${result.result?.message_id}`);
  return true;
}

// ============================================================
// Channel: WhatsApp — CallMeBot API (FREE)
// ============================================================

async function sendWhatsApp(config: ChannelConfig, payload: NotificationPayload): Promise<boolean> {
  const phone = config.phoneNumber || config.whatsappPhone || '';
  if (!phone) throw new Error('WhatsApp phone number is required');

  const apiKey = config.whatsappApiKey;
  if (!apiKey) {
    throw new Error('Clé API CallMeBot manquante. Allez sur Agent IA > Notifications > éditez votre canal WhatsApp.');
  }

  const priorityEmoji = payload.priority === 'high' ? '🔴' : payload.priority === 'low' ? '🔵' : '🟡';
  const text = `${priorityEmoji} *${payload.title}*\n\n${payload.message}${
    payload.actionUrl ? `\n\n👉 Voir: ${payload.actionUrl}` : ''
  }\n\n— AI SaaS Agent`;

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

  console.log(`[WhatsApp/CallMeBot] Sending to ${cleanPhone}...`);
  const response = await fetch(url, { method: 'GET' });
  const responseText = await response.text();

  if (!response.ok || responseText.includes('ERROR') || responseText.includes('Api key')) {
    throw new Error(`CallMeBot: ${responseText.trim() || 'HTTP ' + response.status}`);
  }

  console.log(`[WhatsApp/CallMeBot] OK — ${responseText.trim()}`);
  return true;
}

// ============================================================
// Test a single notification channel
// ============================================================

export async function testNotificationChannel(
  channelType: string,
  config: ChannelConfig
): Promise<{ success: boolean; error?: string }> {
  const testPayload: NotificationPayload = {
    userId: '__test__',
    eventType: 'test',
    title: '✅ Test de notification',
    message: 'Ceci est un message de test. Votre canal est correctement configure !',
    priority: 'normal',
  };

  try {
    switch (channelType) {
      case 'email':
        return { success: await sendEmail(config.email || '', testPayload) };
      case 'telegram':
        return { success: await sendTelegram(config.botToken || config.telegramBotToken || '', config.chatId || config.telegramChatId || '', testPayload) };
      case 'whatsapp':
        return { success: await sendWhatsApp(config, testPayload) };
      default:
        return { success: false, error: 'Type de canal inconnu' };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================
// Helpers
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
