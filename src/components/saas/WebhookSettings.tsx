'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Webhook,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Zap,
  Shield,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_EVENTS = [
  { key: 'post.created', label: 'Post créé', description: 'Quand un nouveau post est créé' },
  { key: 'post.published', label: 'Post publié', description: 'Quand un post est publié sur LinkedIn' },
  { key: 'post.approved', label: 'Post approuvé', description: 'Quand un post est approuvé par un validateur' },
  { key: 'post.rejected', label: 'Post rejeté', description: 'Quand un post est rejeté' },
  { key: 'prospect.created', label: 'Prospect créé', description: 'Quand un nouveau prospect est ajouté' },
  { key: 'prospect.scored', label: 'Prospect scoré', description: 'Quand le score d\'un prospect est mis à jour' },
  { key: 'comment.received', label: 'Commentaire reçu', description: 'Quand un commentaire est reçu sur un post' },
  { key: 'analytics.synced', label: 'Analytics synchronisé', description: 'Quand les métriques sont synchronisées' },
];

// ============================================================
// Component
// ============================================================

export default function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const data = await apiFetch<{ webhooks: WebhookSubscription[] }>('/api/webhooks');
      setWebhooks(data.webhooks);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await apiFetch<{ success: boolean; statusCode?: number; error?: string }>(
        `/api/webhooks/${id}/test`,
        { method: 'POST' }
      );
      if (result.success) {
        toast.success('Test réussi ! Le webhook a répondu avec un statut ' + result.statusCode);
      } else {
        toast.error('Test échoué : ' + (result.error || 'Erreur inconnue'));
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setTestingId(null);
      fetchWebhooks();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/webhooks/${deleteId}`, { method: 'DELETE' });
      toast.success('Webhook supprimé');
      setDeleteId(null);
      fetchWebhooks();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    }
  };

  const handleToggle = async (wh: WebhookSubscription) => {
    try {
      await apiFetch(`/api/webhooks/${wh.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !wh.isActive }),
      });
      toast.success(wh.isActive ? 'Webhook désactivé' : 'Webhook activé');
      fetchWebhooks();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    }
  };

  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  const parseEvents = (eventsStr: string | string[]): string[] => {
    try {
      const arr = typeof eventsStr === 'string' ? JSON.parse(eventsStr) : eventsStr;
      if (!Array.isArray(arr)) return [];
      if (arr.includes('*')) return ['*'];
      return arr;
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4" />
          <h3 className="text-base font-semibold">Webhooks sortants</h3>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Ajouter un webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <CreateWebhookForm
              onSuccess={() => {
                setCreateOpen(false);
                fetchWebhooks();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhook list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 border border-dashed border-border/50 rounded-lg text-center">
          <Webhook className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Aucun webhook configuré</p>
          <p className="text-xs mt-1">
            Connectez DataSphere à Zapier, Make ou n8n pour automatiser vos workflows.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => {
            const events = parseEvents(wh.events);
            const isAll = events.includes('*');

            return (
              <Card key={wh.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{wh.name}</span>
                        {wh.isActive ? (
                          <Badge className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <XCircle className="w-2.5 h-2.5" />
                            En pause
                          </Badge>
                        )}
                        {wh.lastStatusCode && (
                          <Badge
                            variant={wh.lastStatusCode >= 200 && wh.lastStatusCode < 300 ? 'outline' : 'destructive'}
                            className="text-[10px]"
                          >
                            {wh.lastStatusCode}
                          </Badge>
                        )}
                      </div>

                      {/* URL truncated */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono truncate max-w-[300px]">{wh.url}</span>
                      </div>

                      {/* Events badges */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {isAll ? (
                          <Badge variant="secondary" className="text-[10px]">Tous les événements</Badge>
                        ) : (
                          events.map((ev) => {
                            const evt = AVAILABLE_EVENTS.find((e) => e.key === ev);
                            return (
                              <Badge key={ev} variant="outline" className="text-[10px]">
                                {evt?.label || ev}
                              </Badge>
                            );
                          })
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeDate(wh.lastTriggeredAt)}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ✓ {wh.successCount}
                        </span>
                        <span className="text-red-500 dark:text-red-400">
                          ✗ {wh.failureCount}
                        </span>
                        {wh.lastError && (
                          <span className="text-red-500 dark:text-red-400 truncate max-w-[200px]" title={wh.lastError}>
                            {wh.lastError}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={wh.isActive}
                        onCheckedChange={() => handleToggle(wh)}
                        className="scale-90"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTest(wh.id)}
                        disabled={testingId === wh.id || !wh.isActive}
                        title="Envoyer un test"
                      >
                        {testingId === wh.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(wh.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Usage Guide */}
      <Separator />
      <WebhookUsageGuide />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce webhook ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les événements ne seront plus envoyés à cette URL. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Create Webhook Form
// ============================================================

function CreateWebhookForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['*']);
  const [creating, setCreating] = useState(false);

  const isAllEvents = selectedEvents.includes('*');

  const toggleEvent = (eventKey: string) => {
    if (eventKey === '*') {
      setSelectedEvents(isAllEvents ? [] : ['*']);
      return;
    }
    if (isAllEvents) {
      setSelectedEvents(
        AVAILABLE_EVENTS.filter((e) => e.key !== '*').map((e) => e.key).filter((k) => k !== eventKey)
      );
      return;
    }
    setSelectedEvents((prev) =>
      prev.includes(eventKey) ? prev.filter((e) => e !== eventKey) : [...prev, eventKey]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast.error('Nom et URL sont requis');
      return;
    }

    setCreating(true);
    try {
      const result = await apiFetch<{ id: string; secret: string }>('/api/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          events: selectedEvents,
        }),
      });

      toast.success('Webhook créé avec succès ! Copiez le secret ci-dessous.');

      // Show secret in a user-friendly way
      void result; // use result below for secret display
      const secret = (result as { secret: string }).secret;
      if (secret) {
        // We can't easily show this in the dialog after closing, so we'll use a toast approach
        setTimeout(() => {
          navigator.clipboard.writeText(secret).then(() => {
            toast.info('Secret copié dans le presse-papier ! Conservez-le en lieu sûr.', {
              duration: 6000,
            });
          }).catch(() => {
            toast.info(`Secret : ${secret}`, { duration: 8000 });
          });
        }, 500);
      }

      setName('');
      setUrl('');
      setSelectedEvents(['*']);
      onSuccess();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Webhook className="w-4 h-4" />
          Nouveau webhook
        </DialogTitle>
        <DialogDescription>
          Connectez DataSphere à un service externe (Zapier, Make, n8n, etc.).
          Un secret de signature HMAC-SHA256 sera généré automatiquement.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleCreate} className="space-y-4 mt-2">
        <div className="space-y-1.5">
          <Label htmlFor="wh-name" className="text-xs text-muted-foreground">
            Nom du webhook <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wh-name"
            placeholder="ex: Zapier - Création de post"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={creating}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wh-url" className="text-xs text-muted-foreground">
            URL du webhook <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wh-url"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            disabled={creating}
            className="h-9 text-sm font-mono"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Événements</Label>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="wh-all-events"
                checked={isAllEvents}
                onCheckedChange={() => toggleEvent('*')}
                disabled={creating}
              />
              <Label htmlFor="wh-all-events" className="text-xs cursor-pointer">
                Tous les événements
              </Label>
            </div>
          </div>

          {!isAllEvents && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-md border border-border/50 p-2">
              {AVAILABLE_EVENTS.filter((e) => e.key !== '*').map((evt) => (
                <div key={evt.key} className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50">
                  <Checkbox
                    id={`wh-ev-${evt.key}`}
                    checked={selectedEvents.includes(evt.key)}
                    onCheckedChange={() => toggleEvent(evt.key)}
                    disabled={creating}
                    className="mt-0.5"
                  />
                  <Label htmlFor={`wh-ev-${evt.key}`} className="text-xs cursor-pointer leading-tight">
                    <span className="font-medium">{evt.label}</span>
                    <span className="block text-muted-foreground text-[10px] mt-0.5">{evt.description}</span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={creating || !name.trim() || !url.trim()} className="gap-1.5">
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Créer le webhook
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

// ============================================================
// Usage Guide
// ============================================================

function WebhookUsageGuide() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Guide d&apos;utilisation des webhooks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Les webhooks permettent à DataSphere d&apos;envoyer des données en temps réel vers vos outils favoris.
          Chaque envoi inclut une signature HMAC-SHA256 pour vérifier l&apos;authenticité des données.
        </p>

        {/* Signature info */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Vérification de signature
          </div>
          <div className="text-[11px] text-muted-foreground space-y-1 font-mono">
            <p>Chaque webhook envoie les en-têtes suivants :</p>
            <div className="bg-background rounded p-2 space-y-1 text-[10px]">
              <p><span className="text-amber-600 dark:text-amber-400">X-Webhook-Signature</span>: HMAC-SHA256 du payload</p>
              <p><span className="text-amber-600 dark:text-amber-400">X-Webhook-Event</span>: Nom de l&apos;événement</p>
              <p><span className="text-amber-600 dark:text-amber-400">X-Webhook-Delivery</span>: ID unique de livraison</p>
            </div>
            <p className="font-sans">
              Pour vérifier : <code className="bg-muted px-1 rounded">sha256 = HMAC(secret, raw_body)</code>
            </p>
          </div>
        </div>

        {/* Zapier guide */}
        <details className="group rounded-lg border border-border/50">
          <summary
            className="flex items-center justify-between cursor-pointer p-3 text-xs font-medium hover:bg-muted/30 rounded-lg select-none"
            onClick={() => toggle('zapier')}
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              Connecter avec Zapier
            </span>
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          </summary>
          <div className="px-3 pb-3 text-[11px] text-muted-foreground space-y-2">
            <ol className="list-decimal list-inside space-y-1">
              <li>Créez un nouveau Zap sur <span className="font-medium text-foreground">zapier.com</span></li>
              <li>Choisissez le déclencheur <span className="font-mono bg-muted px-1 rounded">&quot;Webhooks by Zapier&quot; → &quot;Catch Hook&quot;</span></li>
              <li>Zapier vous donne une URL — copiez-la</li>
              <li>Ajoutez un webhook dans DataSphere avec cette URL</li>
              <li>Sélectionnez les événements souhaités</li>
              <li>Envoyez un test depuis DataSphere pour confirmer la connexion</li>
              <li>Configurez l&apos;action suivante dans votre Zap (Google Sheets, Slack, Email, etc.)</li>
            </ol>
            <div className="rounded bg-muted/50 p-2">
              <p className="font-sans">
                💡 <span className="font-medium text-foreground">Astuce :</span> Utilisez le champ <code className="bg-muted px-0.5 rounded">X-Webhook-Signature</code> dans un filtre Zapier pour vérifier que les données viennent bien de DataSphere.
              </p>
            </div>
          </div>
        </details>

        {/* Make guide */}
        <details className="group rounded-lg border border-border/50">
          <summary
            className="flex items-center justify-between cursor-pointer p-3 text-xs font-medium hover:bg-muted/30 rounded-lg select-none"
            onClick={() => toggle('make')}
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
              Connecter avec Make (Integromat)
            </span>
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          </summary>
          <div className="px-3 pb-3 text-[11px] text-muted-foreground space-y-2">
            <ol className="list-decimal list-inside space-y-1">
              <li>Créez un nouveau scénario sur <span className="font-medium text-foreground">make.com</span></li>
              <li>Ajoutez le module <span className="font-mono bg-muted px-1 rounded">&quot;Webhooks&quot; → &quot;Custom webhook&quot;</span></li>
              <li>Make vous donne une URL — copiez-la</li>
              <li>Ajoutez un webhook dans DataSphere avec cette URL</li>
              <li>Envoyez un test depuis DataSphere</li>
              <li>Make détectera automatiquement la structure des données</li>
              <li>Ajoutez les modules suivants (Google Sheets, Notion, Slack, etc.)</li>
            </ol>
            <div className="rounded bg-muted/50 p-2">
              <p className="font-sans">
                💡 <span className="font-medium text-foreground">Astuce :</span> Dans Make, ajoutez un outil <span className="font-mono">&quot;Router&quot;</span> avec un filtre sur <code className="bg-muted px-0.5 rounded">X-Webhook-Event</code> pour traiter différemment chaque type d&apos;événement.
              </p>
            </div>
          </div>
        </details>

        {/* Data format guide */}
        <details className="group rounded-lg border border-border/50">
          <summary
            className="flex items-center justify-between cursor-pointer p-3 text-xs font-medium hover:bg-muted/30 rounded-lg select-none"
            onClick={() => toggle('data')}
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Données envoyées par événement
            </span>
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
          </summary>
          <div className="px-3 pb-3 text-[11px] text-muted-foreground space-y-3">
            <p>Chaque payload est envoyé en JSON avec cette structure :</p>
            <pre className="bg-muted rounded p-2 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
{`{
  "event": "post.created",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "userId": "clxxxx...",
  "data": {
    "postId": "...",
    "subject": "...",
    ...
  }
}`}
            </pre>

            <div className="space-y-2">
              <p className="font-medium text-foreground">Champs par événement :</p>
              <div className="space-y-1.5">
                <div>
                  <span className="font-mono text-amber-600 dark:text-amber-400">post.created</span>
                  <span className="ml-1">→ postId, subject, status, aiProvider, authorId</span>
                </div>
                <div>
                  <span className="font-mono text-amber-600 dark:text-amber-400">post.published</span>
                  <span className="ml-1">→ postId, subject, linkedinPostId, publishMode, authorId</span>
                </div>
                <div>
                  <span className="font-mono text-amber-600 dark:text-amber-400">post.approved</span>
                  <span className="ml-1">→ postId, subject, validatedBy, authorId</span>
                </div>
                <div>
                  <span className="font-mono text-amber-600 dark:text-amber-400">prospect.created</span>
                  <span className="ml-1">→ prospectId, fullName, company, source, score</span>
                </div>
                <div>
                  <span className="font-mono text-amber-600 dark:text-amber-400">comment.received</span>
                  <span className="ml-1">→ postId, subject, comments[], totalComments</span>
                </div>
              </div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
