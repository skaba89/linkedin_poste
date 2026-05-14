'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/lib/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Zap,
  Brain,
  Cpu,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Trash2,
  Play,
  RefreshCw,
  Settings2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  defaultModel: string;
  models: string[];
  maxTokensDefault: number;
  icon: string;
  keySource: 'env' | 'settings' | 'fallback' | 'none';
}

interface ProviderStatus {
  success: boolean;
  latency: number;
  model: string;
  message: string;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  Globe: <Globe className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  Brain: <Brain className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
};

const KEY_SOURCE_LABELS: Record<string, string> = {
  env: 'Variable d\'environnement',
  settings: 'Base de données (configurée ici)',
  fallback: 'Toujours disponible',
  none: 'Non configurée',
};

const KEY_SOURCE_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  env: { variant: 'secondary', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  settings: { variant: 'secondary', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  fallback: { variant: 'secondary', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
  none: { variant: 'destructive', className: '' },
};

// ============================================================
// Component
// ============================================================

export default function AIProviderSection() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<string>('openrouter');
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openrouter: '',
    groq: '',
    glm: '',
    zai: '',
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ProviderStatus>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const data = await apiFetch<{ providers: ProviderInfo[]; defaultProvider: string }>('/api/ai-providers');
      setProviders(data.providers);
      setDefaultProvider(data.defaultProvider);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSaveKey = async (provider: string) => {
    const key = apiKeys[provider];
    if (!key || key.trim().length === 0) {
      toast.error('Veuillez saisir une clé API');
      return;
    }
    setSaving(provider);
    try {
      await apiFetch('/api/ai-providers', {
        method: 'POST',
        body: JSON.stringify({ action: 'save_key', provider, apiKey: key.trim() }),
      });
      toast.success(`Clé API ${provider} enregistrée`);
      setApiKeys((prev) => ({ ...prev, [provider]: '' }));
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      fetchProviders();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    setDeleting(provider);
    try {
      await apiFetch('/api/ai-providers', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_key', provider }),
      });
      toast.success(`Clé API ${provider} supprimée`);
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      fetchProviders();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleTest = async (provider: string) => {
    setTesting(provider);
    setTestResults((prev) => ({ ...prev, [provider]: { success: false, latency: 0, model: '', message: 'Test en cours...' } }));
    try {
      const data = await apiFetch<{ result: ProviderStatus }>('/api/ai-providers', {
        method: 'POST',
        body: JSON.stringify({ action: 'test', provider }),
      });
      setTestResults((prev) => ({ ...prev, [provider]: data.result }));
      if (data.result.success) {
        toast.success(`${provider} : connexion réussie (${data.result.latency}ms)`);
      } else {
        toast.error(`${provider} : échec — ${data.result.message}`);
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
      setTestResults((prev) => ({
        ...prev,
        [provider]: { success: false, latency: 0, model: '', message: 'Erreur de test' },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleSetDefault = async (value: string) => {
    try {
      await apiFetch('/api/ai-providers', {
        method: 'POST',
        body: JSON.stringify({ action: 'set_default', defaultProvider: value }),
      });
      setDefaultProvider(value);
      toast.success(`Fournisseur par défaut : ${value}`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // All providers are now configurable (including ZAI)
  const allProviders = providers;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Configuration des fournisseurs IA
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gérez vos clés API et le fournisseur IA par défaut. Si un fournisseur échoue, le système bascule automatiquement vers le suivant.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Provider Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Fournisseur par défaut</Label>
          <Select value={defaultProvider} onValueChange={handleSetDefault}>
            <SelectTrigger className="w-full sm:w-80 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allProviders.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    {PROVIDER_ICONS[p.icon]}
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Provider Cards */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Fournisseurs disponibles</Label>

          {allProviders.map((provider) => {
            const isConfigured = provider.keySource !== 'none';
            const badgeStyle = KEY_SOURCE_BADGE[provider.keySource];
            const testResult = testResults[provider.id];

            return (
              <div
                key={provider.id}
                className="rounded-lg border border-border/60 p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${
                        isConfigured
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                      }`}
                    >
                      {PROVIDER_ICONS[provider.icon]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{provider.name}</span>
                        <Badge variant={badgeStyle.variant} className={`text-[10px] ${badgeStyle.className}`}>
                          {isConfigured ? (
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                          ) : (
                            <XCircle className="w-2.5 h-2.5 mr-0.5" />
                          )}
                          {KEY_SOURCE_LABELS[provider.keySource]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleTest(provider.id)}
                      disabled={testing === provider.id || !isConfigured}
                    >
                      {testing === provider.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      Tester
                    </Button>
                  </div>
                </div>

                {/* Test result */}
                {testResult && (
                  <div
                    className={`text-xs rounded-md px-3 py-2 flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {testResult.success
                        ? `Connecté (${testResult.latency}ms) — ${testResult.model}`
                        : testResult.message}
                    </span>
                  </div>
                )}

                {/* API Key Input */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {provider.keySource === 'none'
                        ? `Saisir la clé API ${provider.name}`
                        : `Nouvelle clé API ${provider.name} (optionnel)`}
                    </Label>
                    <Input
                      type="password"
                      placeholder={provider.keySource === 'none' ? 'Clé API...' : 'Laisser vide pour garder l\'existante'}
                      value={apiKeys[provider.id] || ''}
                      onChange={(e) => setApiKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                      disabled={saving === provider.id}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 gap-1 shrink-0"
                    onClick={() => handleSaveKey(provider.id)}
                    disabled={saving === provider.id || !apiKeys[provider.id]?.trim()}
                  >
                    {saving === provider.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    Enregistrer
                  </Button>
                  {provider.keySource === 'settings' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteKey(provider.id)}
                      disabled={deleting === provider.id}
                    >
                      {deleting === provider.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1.5">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-semibold">Comment fonctionne le système IA</p>
              <ul className="list-disc list-inside space-y-0.5 opacity-90">
                <li>Le système essaie le fournisseur par défaut en premier</li>
                <li>En cas d&apos;échec, il bascule automatiquement vers le fournisseur suivant</li>
                <li>Les clés API sont stockées en base de données, pas dans les variables d&apos;environnement</li>
                <li>Les variables d&apos;environnement sont utilisées comme source secondaire</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
