import { Resend } from 'resend';

// ============================================================
// Types
// ============================================================

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// ============================================================
// Resend Client (lazy init)
// ============================================================

let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  _resend = new Resend(apiKey);
  return _resend;
}

// ============================================================
// Professional HTML Email Template with DataSphere branding
// ============================================================

function buildBrandedHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DataSphere — Notification</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f0f2f5;
      color: #1a1a2e;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .header p {
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      font-weight: 400;
    }
    .body {
      padding: 36px 40px;
    }
    .body h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1e293b;
    }
    .body p {
      font-size: 15px;
      color: #475569;
      margin-bottom: 16px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin: 20px 0;
      transition: opacity 0.2s;
    }
    .cta-button:hover { opacity: 0.9; }
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }
    .footer {
      background: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      background: #eff6ff;
      color: #3b82f6;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 DataSphere</h1>
      <p>Plateforme LinkedIn SaaS propulsée par l'IA</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>
        © ${new Date().getFullYear()} DataSphere — Tous droits réservés.<br>
        Cet e-mail a été envoyé automatiquement. Ne pas répondre.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// Public: sendRealEmail
// ============================================================

export async function sendRealEmail({ to, subject, html, text }: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const from = process.env.EMAIL_FROM || 'DataSphere <notifications@datasphere.app>';
  const resend = getResendClient();

  // If no API key, fallback to console
  if (!resend) {
    console.log(`[Email/NoKey] To: ${to} | Subject: ${subject}`);
    console.log(`[Email/NoKey] Text: ${text}`);
    return { success: true }; // silent fallback — don't block callers
  }

  try {
    const brandedHtml = buildBrandedHtml(html);

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html: brandedHtml,
      text,
    });

    if (error) {
      console.error('[Email/Resend] Error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email/Resend] Sent to ${to}, id: ${data?.id}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email/Resend] Exception:', msg);
    return { success: false, error: msg };
  }
}

// ============================================================
// Convenience: build notification HTML block
// ============================================================

export function buildNotificationHtml(params: {
  title: string;
  message: string;
  priorityEmoji?: string;
  actionUrl?: string;
  actionLabel?: string;
}): string {
  const { title, message, priorityEmoji = '', actionUrl, actionLabel = 'Voir les détails' } = params;

  let actionBlock = '';
  if (actionUrl) {
    actionBlock = `
      <p>
        <a href="${actionUrl}" class="cta-button">${actionLabel}</a>
      </p>
    `;
  }

  return `
    <span class="badge">${priorityEmoji} Notification</span>
    <h2>${title}</h2>
    <p>${message.replace(/\n/g, '<br>')}</p>
    ${actionBlock}
    <hr class="divider" />
    <p style="font-size:13px;color:#94a3b8;">
      Si vous ne souhaitez plus recevoir ces notifications, vous pouvez les désactiver depuis les paramètres de votre compte.
    </p>
  `;
}

// ============================================================
// Convenience: build password reset HTML block
// ============================================================

export function buildPasswordResetHtml(params: { resetUrl: string; userName: string }): string {
  const { resetUrl, userName } = params;
  return `
    <span class="badge">🔐 Sécurité</span>
    <h2>Réinitialisation de votre mot de passe</h2>
    <p>Bonjour <strong>${userName}</strong>,</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
    <p>
      <a href="${resetUrl}" class="cta-button">Réinitialiser mon mot de passe</a>
    </p>
    <hr class="divider" />
    <p style="font-size:13px;color:#94a3b8;">
      ⚠️ Ce lien expire dans <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.<br><br>
      Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
      <span style="word-break:break-all;color:#6366f1;">${resetUrl}</span>
    </p>
  `;
}
