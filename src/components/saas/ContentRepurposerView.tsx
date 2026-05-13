'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Repeat,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  Wand2,
  FileText,
  Search,
  Settings2,
  Zap,
  Check,
  X,
  Clock,
  TrendingUp,
  Eye,
  PenSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Post } from '@/types';

// ============================================================
// Types
// ============================================================

interface RepurposedItem {
  id: string;
  sourcePostId: string | null;
  sourceContent: string;
  sourceType: string;
  targetType: string;
  generatedContent: string;
  title: string | null;
  qualityScore: number;
  isUsed: boolean;
  createdAt: string;
}

interface RecyclingRule {
  id: string;
  name: string;
  description: string | null;
  minDaysOld: number;
  minScore: number;
  maxRecycles: number;
  autoRecycle: boolean;
  frequency: string;
  isActive: boolean;
  createdAt: string;
}

interface RecycleStats {
  totalScanned: number;
  eligible: number;
  alreadyMaxRecycled: number;
  posts: { id: string; subject: string; score: number | null; timesRecycled: number; createdAt: string }[];
}

// ============================================================
// Constants
// ============================================================

const TARGET_FORMATS = [
  { value: 'carousel', label: 'Carrousel', icon: '🖼️' },
  { value: 'thread', label: 'Thread LinkedIn', icon: '🔗' },
  { value: 'newsletter', label: 'Newsletter', icon: '📧' },
  { value: 'hook', label: 'Hook reformulé', icon: '🪝' },
  { value: 'short', label: 'Version courte', icon: '⚡' },
  { value: 'long', label: 'Version longue', icon: '📝' },
  { value: 'twitter_thread', label: 'Thread Twitter/X', icon: '🐦' },
  { value: 'email', label: 'Email prospect', icon: '📬' },
];

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
};

const TARGET_LABELS: Record<string, string> = {
  carousel: 'Carrousel',
  thread: 'Thread LinkedIn',
  newsletter: 'Newsletter',
  hook: 'Hook reformulé',
  short: 'Version courte',
  long: 'Version longue',
  twitter_thread: 'Thread Twitter/X',
  email: 'Email prospect',
};

// ============================================================
// Main Component
// ============================================================

export default function ContentRepurposerView() {
  const [activeTab, setActiveTab] = useState('repurpose');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
          <Repeat className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Recyclage de Contenu</h2>
          <p className="text-sm text-muted-foreground">
            Transformez et recyclez votre contenu en de nouveaux formats
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="repurpose" className="gap-1.5 text-xs sm:text-sm">
            <Wand2 className="w-4 h-4 hidden sm:inline" />
            Recycler du contenu
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs sm:text-sm">
            <Settings2 className="w-4 h-4 hidden sm:inline" />
            Règles
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="w-4 h-4 hidden sm:inline" />
            Bibliothèque
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repurpose">
          <RepurposeTab />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Repurpose Tab
// ============================================================

function RepurposeTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<RepurposedItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const data = await apiFetch<{ posts: Post[] }>('/api/posts?status=posted&limit=50');
      setPosts(data.posts);
    } catch {
      // silent
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const toggleFormat = (format: string) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleGenerate = async () => {
    const hasSource = selectedPostId || manualContent.trim();
    if (!hasSource) {
      toast.error('Sélectionnez un post ou saisissez du contenu');
      return;
    }
    if (selectedFormats.length === 0) {
      toast.error('Sélectionnez au moins un format cible');
      return;
    }
    setGenerating(true);
    try {
      const data = await apiFetch<{ repurposed: RepurposedItem[] }>('/api/content/repurpose', {
        method: 'POST',
        body: JSON.stringify({
          sourcePostId: selectedPostId || undefined,
          sourceContent: manualContent || undefined,
          targetTypes: selectedFormats,
        }),
      });
      setResults(data.repurposed);
      toast.success(`${data.repurposed.length} variant(s) généré(s) !`);
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié !');
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Recycler du contenu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source Post Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Post source</Label>
            <Select value={selectedPostId} onValueChange={setSelectedPostId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sélectionner un post publié..." />
              </SelectTrigger>
              <SelectContent>
                {loadingPosts ? (
                  <SelectItem value="_loading" disabled>Chargement...</SelectItem>
                ) : posts.length === 0 ? (
                  <SelectItem value="_empty" disabled>Aucun post publié</SelectItem>
                ) : (
                  posts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.subject.slice(0, 80)}{p.subject.length > 80 ? '...' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Ou saisir du contenu manuellement</Label>
            <Textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Collez votre contenu ici..."
              className="min-h-[80px] text-sm"
            />
          </div>

          <Separator />

          {/* Target Formats */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Formats cibles</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TARGET_FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => toggleFormat(f.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-all',
                    selectedFormats.includes(f.value)
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border/50 hover:bg-muted/50'
                  )}
                >
                  <span>{f.icon}</span>
                  <span className="text-xs">{f.label}</span>
                  {selectedFormats.includes(f.value) && (
                    <Check className="w-3 h-3 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Générer
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Variantes générées ({results.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((item) => (
              <Card key={item.id} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {TARGET_LABELS[item.targetType] || item.targetType}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        Score: {item.qualityScore}/100
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyContent(item.generatedContent)} title="Copier">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        copyContent(item.generatedContent);
                        toast.success('Utilisez ce contenu pour créer un nouveau post');
                      }} title="Utiliser">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.title && (
                    <p className="text-xs font-medium text-muted-foreground mb-2">{item.title}</p>
                  )}
                  <ScrollArea className="h-32">
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{item.generatedContent}</p>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Rules Tab
// ============================================================

function RulesTab() {
  const [rules, setRules] = useState<RecyclingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<RecycleStats | null>(null);
  const [editingRule, setEditingRule] = useState<RecyclingRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMinDays, setFormMinDays] = useState(30);
  const [formMinScore, setFormMinScore] = useState(70);
  const [formMaxRecycles, setFormMaxRecycles] = useState(3);
  const [formAuto, setFormAuto] = useState(false);
  const [formFrequency, setFormFrequency] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ rules: RecyclingRule[] }>('/api/content/recycling-rules');
      setRules(data.rules);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const openCreate = () => {
    setEditingRule(null);
    setFormName('');
    setFormDesc('');
    setFormMinDays(30);
    setFormMinScore(70);
    setFormMaxRecycles(3);
    setFormAuto(false);
    setFormFrequency('monthly');
    setDialogOpen(true);
  };

  const openEdit = (rule: RecyclingRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDesc(rule.description || '');
    setFormMinDays(rule.minDaysOld);
    setFormMinScore(rule.minScore);
    setFormMaxRecycles(rule.maxRecycles);
    setFormAuto(rule.autoRecycle);
    setFormFrequency(rule.frequency);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    setSaving(true);
    try {
      if (editingRule) {
        await apiFetch(`/api/content/recycling-rules/${editingRule.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: formName,
            description: formDesc || null,
            minDaysOld: formMinDays,
            minScore: formMinScore,
            maxRecycles: formMaxRecycles,
            autoRecycle: formAuto,
            frequency: formFrequency,
          }),
        });
        toast.success('Règle mise à jour');
      } else {
        await apiFetch('/api/content/recycling-rules', {
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            description: formDesc || null,
            minDaysOld: formMinDays,
            minScore: formMinScore,
            maxRecycles: formMaxRecycles,
            autoRecycle: formAuto,
            frequency: formFrequency,
          }),
        });
        toast.success('Règle créée');
      }
      setDialogOpen(false);
      fetchRules();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/content/recycling-rules/${id}`, { method: 'DELETE' });
      toast.success('Règle supprimée');
      setDeleteId(null);
      fetchRules();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const data = await apiFetch<RecycleStats>('/api/content/recycle', { method: 'POST' });
      setScanResults(data);
      toast.success(`${data.eligible} post(s) éligible(s) au recyclage`);
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleToggleActive = async (rule: RecyclingRule) => {
    try {
      await apiFetch(`/api/content/recycling-rules/${rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      fetchRules();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats + Scan */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="w-4 h-4" />
              Scanner le contenu recyclable
            </CardTitle>
            <Button onClick={handleScan} disabled={scanning} size="sm" className="gap-1.5">
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Scanner maintenant
            </Button>
          </div>
        </CardHeader>
        {scanResults && (
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{scanResults.totalScanned}</p>
                <p className="text-xs text-muted-foreground">Scannés</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{scanResults.eligible}</p>
                <p className="text-xs text-muted-foreground">Éligibles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{scanResults.alreadyMaxRecycled}</p>
                <p className="text-xs text-muted-foreground">Déjà recyclés (max)</p>
              </div>
            </div>
            {scanResults.posts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Posts éligibles :</p>
                {scanResults.posts.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded border border-border/50 px-3 py-2 text-xs">
                    <span className="truncate flex-1">{p.subject}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">Score: {p.score ?? '—'}</Badge>
                      <Badge variant="secondary" className="text-[10px]">Recyclé: {p.timesRecycled}x</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Rules List */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Règles de recyclage
            </CardTitle>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              Créer une règle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="py-8 text-center">
              <Repeat className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune règle configurée</p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <Switch checked={rule.isActive} onCheckedChange={() => handleToggleActive(rule)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {rule.minDaysOld}j min · Score ≥ {rule.minScore} · Max {rule.maxRecycles}x
                        </span>
                        {rule.autoRecycle && <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">Auto</Badge>}
                        <span className="text-[10px] text-muted-foreground">{FREQUENCY_LABELS[rule.frequency] || rule.frequency}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEdit(rule)}>
                      <PenSquare className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => setDeleteId(rule.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Modifier la règle' : 'Nouvelle règle'}</DialogTitle>
            <DialogDescription>
              Configurez les critères de recyclage automatique
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Nom *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Contenu mensuel" className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Description optionnelle..." className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Âge minimum (jours)</Label>
                <Input type="number" value={formMinDays} onChange={(e) => setFormMinDays(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Score minimum</Label>
                <Input type="number" value={formMinScore} onChange={(e) => setFormMinScore(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Max recyclages</Label>
                <Input type="number" value={formMaxRecycles} onChange={(e) => setFormMaxRecycles(parseInt(e.target.value) || 0)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fréquence</Label>
                <Select value={formFrequency} onValueChange={setFormFrequency}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <p className="text-sm font-medium">Recyclage automatique</p>
                <p className="text-xs text-muted-foreground">Lancer automatiquement selon la fréquence</p>
              </div>
              <Switch checked={formAuto} onCheckedChange={setFormAuto} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingRule ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette règle ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Library Tab
// ============================================================

function LibraryTab() {
  const [items, setItems] = useState<RepurposedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterTarget, setFilterTarget] = useState('all');
  const [filterMinScore, setFilterMinScore] = useState('0');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filterTarget !== 'all') params.set('targetType', filterTarget);
      if (filterMinScore !== '0') params.set('minScore', filterMinScore);
      const data = await apiFetch<{ items: RepurposedItem[]; total: number }>(`/api/content/repurposed?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterTarget, filterMinScore]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/content/repurposed/${id}`, { method: 'DELETE' });
      toast.success('Contenu supprimé');
      fetchItems();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  const handleMarkUsed = async (item: RepurposedItem) => {
    if (item.isUsed) return;
    try {
      await apiFetch(`/api/content/repurposed/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isUsed: true }),
      });
      toast.success('Marqué comme utilisé');
      fetchItems();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterTarget} onValueChange={setFilterTarget}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les formats</SelectItem>
                {TARGET_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMinScore} onValueChange={setFilterMinScore}>
              <SelectTrigger className="w-[140px] h-8 text-sm">
                <SelectValue placeholder="Score min" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Tous les scores</SelectItem>
                <SelectItem value="70">Score ≥ 70</SelectItem>
                <SelectItem value="80">Score ≥ 80</SelectItem>
                <SelectItem value="90">Score ≥ 90</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground ml-auto">
              {total} résultat(s)
            </p>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={fetchItems}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun contenu recyclé</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Utilisez l&apos;onglet &quot;Recycler du contenu&quot; pour créer des variantes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => (
            <Card key={item.id} className={cn('border-border/50', item.isUsed && 'opacity-60')}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      {TARGET_LABELS[item.targetType] || item.targetType}
                    </Badge>
                    <Badge variant="secondary" className={cn(
                      'text-[10px]',
                      item.qualityScore >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                      item.qualityScore >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                    )}>
                      {item.qualityScore}/100
                    </Badge>
                    {item.isUsed && <Badge variant="secondary" className="text-[10px]">Utilisé</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyContent(item.generatedContent)} title="Copier">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {!item.isUsed && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMarkUsed(item)} title="Marquer comme utilisé">
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)} title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.title && (
                  <p className="text-xs font-medium text-muted-foreground mb-1">{item.title}</p>
                )}
                <ScrollArea className="h-24">
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{item.generatedContent}</p>
                </ScrollArea>
                <p className="text-[10px] text-muted-foreground/60 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
