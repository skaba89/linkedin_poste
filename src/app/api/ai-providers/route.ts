import { NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { getAIConfig, testProvider, isPlaceholderKey } from '@/lib/ai-providers';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// ============================================================
// GET /api/ai-providers — List providers with status
// ============================================================
export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const providers = await getAIConfig();

    // Read the current default provider from settings
    let defaultProvider: string | null = null;
    try {
      const setting = await db.settings.findUnique({
        where: { key: 'ai_default_provider' },
      });
      if (setting?.value) {
        defaultProvider = setting.value;
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      providers,
      defaultProvider: defaultProvider || 'openrouter',
    });
  } catch (error) {
    console.error('[AI Providers] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ============================================================
// POST /api/ai-providers — Test a provider or save settings
// ============================================================
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin')) {
      return NextResponse.json({ error: 'Administrateur requis' }, { status: 403 });
    }

    const body = await request.json();
    const { action, provider, apiKey, defaultProvider } = body;

    // ── Test a provider connection ──
    if (action === 'test') {
      if (!provider) {
        return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 });
      }

      const validProviders = ['openrouter', 'groq', 'glm', 'zai'];
      if (!validProviders.includes(provider)) {
        return NextResponse.json({ error: 'Fournisseur invalide' }, { status: 400 });
      }

      const result = await testProvider(provider as 'openrouter' | 'groq' | 'glm' | 'zai');

      await createAuditLog({
        entityType: 'Settings',
        action: `test_ai_provider_${provider}`,
        userId: authUser.id,
        metadata: {
          provider,
          success: result.success,
          latency: result.latency,
        },
      });

      return NextResponse.json({ result });
    }

    // ── Save API key for a provider ──
    if (action === 'save_key') {
      if (!provider || !apiKey) {
        return NextResponse.json({ error: 'Fournisseur et clé requis' }, { status: 400 });
      }

      const validProviders = ['openrouter', 'groq', 'glm'];
      if (!validProviders.includes(provider)) {
        return NextResponse.json({ error: 'Fournisseur invalide' }, { status: 400 });
      }

      if (isPlaceholderKey(apiKey)) {
        return NextResponse.json({ error: 'Clé API invalide (placeholder détecté)' }, { status: 400 });
      }

      const settingKey = `ai_${provider}_key`;

      await db.settings.upsert({
        where: { key: settingKey },
        create: { key: settingKey, value: apiKey },
        update: { value: apiKey },
      });

      await createAuditLog({
        entityType: 'Settings',
        action: 'update_ai_api_key',
        userId: authUser.id,
        metadata: { provider, keySource: 'settings' },
      });

      return NextResponse.json({
        success: true,
        message: `Clé API ${provider} enregistrée avec succès`,
      });
    }

    // ── Delete API key for a provider (revert to env) ──
    if (action === 'delete_key') {
      if (!provider) {
        return NextResponse.json({ error: 'Fournisseur requis' }, { status: 400 });
      }

      const settingKey = `ai_${provider}_key`;
      await db.settings.deleteMany({ where: { key: settingKey } }).catch(() => {});

      await createAuditLog({
        entityType: 'Settings',
        action: 'delete_ai_api_key',
        userId: authUser.id,
        metadata: { provider },
      });

      return NextResponse.json({
        success: true,
        message: `Clé API ${provider} supprimée (retour aux variables d'environnement)`,
      });
    }

    // ── Set default provider ──
    if (action === 'set_default') {
      const validProviders = ['openrouter', 'groq', 'glm', 'zai'];
      if (!defaultProvider || !validProviders.includes(defaultProvider)) {
        return NextResponse.json({ error: 'Fournisseur par défaut invalide' }, { status: 400 });
      }

      await db.settings.upsert({
        where: { key: 'ai_default_provider' },
        create: { key: 'ai_default_provider', value: defaultProvider },
        update: { value: defaultProvider },
      });

      await createAuditLog({
        entityType: 'Settings',
        action: 'set_default_ai_provider',
        userId: authUser.id,
        metadata: { defaultProvider },
      });

      return NextResponse.json({
        success: true,
        message: `Fournisseur par défaut défini sur ${defaultProvider}`,
      });
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  } catch (error) {
    console.error('[AI Providers] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
