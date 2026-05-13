'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  Play,
  Square,
  Trash2,
  Trophy,
  GitCompareArrows,
  Sparkles,
  RefreshCw,
  Eye,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import EmptyState from './EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type {
  ABTest,
  ABTestStatus,
  ABTestCriteria,
  Post,
} from '@/types';
import {
  AB_TEST_STATUS_LABELS,
  AB_TEST_STATUS_COLORS,
  AB_TEST_CRITERIA_LABELS,
} from '@/types';

/* ============================================================
   Create Test Dialog
   ============================================================ */
function CreateTestDialog({ onCreated, externalOpen, onExternalOpenChange }: { onCreated: () => void; externalOpen?: boolean; onExternalOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [postAId, setPostAId] = useState('');
  const [postBId, setPostBId] = useState('');
  const [criteria, setCriteria] = useState<ABTestCriteria>('engagement');

  const controlled = externalOpen !== undefined;
  const open = controlled ? externalOpen : internalOpen;
  const setOpen = controlled ? (v: boolean) => onExternalOpenChange?.(v) : setInternalOpen;

  useEffect(() => {
    if (open) {
      setLoading(true);
      apiFetch<{ posts: Post[] }>('/api/posts?status=posted&limit=100')
        .then(data => setPosts(data.posts))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name || !postAId || !postBId) {
      toast.error('Nom, Post A et Post B sont requis');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/ab-tests', {
        method: 'POST',
        body: JSON.stringify({ name, description, postAId, postBId, criteria }),
      });
      toast.success('Test A/B créé');
      setOpen(false);
      setName(''); setDescription(''); setPostAId(''); setPostBId('');
      onCreated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const postA = posts.find(p => p.id === postAId);
  const postB = posts.find(p => p.id === postBId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Nouveau test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau Test A/B</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du test</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Listicle vs Storytelling" />
          </div>
          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Post A</Label>
              <Select value={postAId} onValueChange={setPostAId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {posts.map(p => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === postBId}>
                      <span className="truncate max-w-[200px]">{p.subject}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Post B</Label>
              <Select value={postBId} onValueChange={setPostBId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {posts.map(p => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === postAId}>
                      <span className="truncate max-w-[200px]">{p.subject}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Critère de succès</Label>
            <Select value={criteria} onValueChange={v => setCriteria(v as ABTestCriteria)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(AB_TEST_CRITERIA_LABELS) as [ABTestCriteria, string][]).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Side-by-side preview */}
          {postA && postB && (
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-3">
                  <p className="text-[10px] font-bold text-blue-600 mb-1">POST A</p>
                  <p className="text-xs line-clamp-3">{postA.subject}</p>
                  {postA.contentScore && <p className="text-[10px] text-muted-foreground mt-1">Score : {postA.contentScore}/100</p>}
                </CardContent>
              </Card>
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-3">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">POST B</p>
                  <p className="text-xs line-clamp-3">{postB.subject}</p>
                  {postB.contentScore && <p className="text-[10px] text-muted-foreground mt-1">Score : {postB.contentScore}/100</p>}
                </CardContent>
              </Card>
            </div>
          )}

          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Créer le test
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Add Reading Dialog
   ============================================================ */
function AddReadingDialog({ testId, onAdded }: { testId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formA, setFormA] = useState({ impressions: '', likes: '', comments: '', reposts: '', clicks: '' });
  const [formB, setFormB] = useState({ impressions: '', likes: '', comments: '', reposts: '', clicks: '' });

  const handleSave = async () => {
    setSaving(true);
    try {
      const readings = [
        ...Object.entries(formA).map(([metric, value]) => ({ variant: 'A' as const, metric, value: Number(value) || 0 })),
        ...Object.entries(formB).map(([metric, value]) => ({ variant: 'B' as const, metric, value: Number(value) || 0 })),
      ];
      await apiFetch(`/api/ab-tests/${testId}/readings`, {
        method: 'POST',
        body: JSON.stringify({ readings }),
      });
      toast.success('Données enregistrées');
      setOpen(false);
      setFormA({ impressions: '', likes: '', comments: '', reposts: '', clicks: '' });
      setFormB({ impressions: '', likes: '', comments: '', reposts: '', clicks: '' });
      onAdded();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'impressions', label: 'Impressions' },
    { key: 'likes', label: 'Likes' },
    { key: 'comments', label: 'Commentaires' },
    { key: 'reposts', label: 'Reposts' },
    { key: 'clicks', label: 'Clics' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Ajouter des données
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter des données de lecture</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-blue-600">Variante A</p>
            {fields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input type="number" min="0" value={formA[f.key as keyof typeof formA]} onChange={e => setFormA(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Variante B</p>
            {fields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input type="number" min="0" value={formB[f.key as keyof typeof formB]} onChange={e => setFormB(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
          Enregistrer
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Test Result View
   ============================================================ */
function TestResultView({ test, onUpdate }: { test: ABTest; onUpdate: () => void }) {
  const [declaring, setDeclaring] = useState(false);
  const [winnerConfirmOpen, setWinnerConfirmOpen] = useState(false);

  const readingsA = test.readings?.filter(r => r.variant === 'A') || [];
  const readingsB = test.readings?.filter(r => r.variant === 'B') || [];

  const sumByMetric = (readings: typeof readingsA) => {
    const sums: Record<string, number> = {};
    for (const r of readings) {
      sums[r.metric] = (sums[r.metric] || 0) + r.value;
    }
    return sums;
  };

  const metricsA = sumByMetric(readingsA);
  const metricsB = sumByMetric(readingsB);

  const metricLabels: Record<string, string> = {
    impressions: 'Impressions',
    likes: 'Likes',
    comments: 'Commentaires',
    reposts: 'Reposts',
    clicks: 'Clics',
  };

  const chartData = Object.entries(metricLabels).map(([key, label]) => ({
    metric: label,
    A: metricsA[key] || 0,
    B: metricsB[key] || 0,
  }));

  const handleDeclareWinner = async () => {
    setWinnerConfirmOpen(false);
    setDeclaring(true);
    try {
      await apiFetch(`/api/ab-tests/${test.id}/declare-winner`, { method: 'POST' });
      toast.success('Gagnant déclaré !');
      onUpdate();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setDeclaring(false);
    }
  };

  const winnerVariant = test.winnerId === test.postAId ? 'A' : test.winnerId === test.postBId ? 'B' : null;

  return (
    <div className="space-y-4">
      {/* Status & Winner */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn('text-xs', AB_TEST_STATUS_COLORS[test.status])}>
          {AB_TEST_STATUS_LABELS[test.status]}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Critère : {AB_TEST_CRITERIA_LABELS[test.criteria as ABTestCriteria]}
        </Badge>
        {winnerVariant && (
          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Trophy className="w-3 h-3 mr-1" />
            Gagnant : Variante {winnerVariant}
          </Badge>
        )}
      </div>

      {/* Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={cn('border-border/50', winnerVariant === 'A' ? 'ring-2 ring-emerald-500' : '')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-blue-600 font-bold">Variante A</span>
              {winnerVariant === 'A' && <Trophy className="w-4 h-4 text-amber-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-medium line-clamp-2">{test.postA?.subject}</p>
            {test.postA?.contentScore && <p className="text-[10px] text-muted-foreground">Score IA : {test.postA.contentScore}/100</p>}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(metricLabels).map(([key, label]) => (
                <div key={key} className="text-xs">
                  <span className="text-muted-foreground">{label}:</span>{' '}
                  <span className="font-semibold">{(metricsA[key] || 0).toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className={cn('border-border/50', winnerVariant === 'B' ? 'ring-2 ring-emerald-500' : '')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400 font-bold">Variante B</span>
              {winnerVariant === 'B' && <Trophy className="w-4 h-4 text-amber-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-medium line-clamp-2">{test.postB?.subject}</p>
            {test.postB?.contentScore && <p className="text-[10px] text-muted-foreground">Score IA : {test.postB.contentScore}/100</p>}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(metricLabels).map(([key, label]) => (
                <div key={key} className="text-xs">
                  <span className="text-muted-foreground">{label}:</span>{' '}
                  <span className="font-semibold">{(metricsB[key] || 0).toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      {chartData.some(d => d.A > 0 || d.B > 0) && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Comparaison des métriques</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="metric" tick={{ fontSize: 11 }} width={100} />
                  <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="A" fill="#3b82f6" name="Variante A" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="B" fill="#f59e0b" name="Variante B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {test.status === 'running' && (
          <>
            <AddReadingDialog testId={test.id} onAdded={onUpdate} />
            <Button variant="default" size="sm" onClick={() => setWinnerConfirmOpen(true)} disabled={declaring || (readingsA.length === 0 && readingsB.length === 0)} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Déclarer un gagnant
            </Button>
          </>
        )}
      </div>

      {/* Declare Winner Confirmation Dialog */}
      <AlertDialog open={winnerConfirmOpen} onOpenChange={setWinnerConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déclarer ce variant comme gagnant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeclareWinner}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   Main: ABTestingView
   ============================================================ */
export default function ABTestingView() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [testToCancel, setTestToCancel] = useState<string | null>(null);
  const [showCreateTest, setShowCreateTest] = useState(false);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ tests: ABTest[] }>('/api/ab-tests');
      setTests(data.tests);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const handleSeed = async () => {
    try {
      const data = await apiFetch<{ seeded: number }>('/api/ab-tests/seed', { method: 'POST' });
      toast.success(`${data.seeded} tests de démonstration créés`);
      fetchTests();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await apiFetch(`/api/ab-tests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'running', startDate: new Date().toISOString() }),
      });
      toast.success('Test démarré');
      fetchTests();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleCancel = (id: string) => {
    setTestToCancel(id);
    setCancelConfirmOpen(true);
  };

  const confirmCancel = async () => {
    if (!testToCancel) return;
    try {
      await apiFetch(`/api/ab-tests/${testToCancel}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled', endDate: new Date().toISOString() }),
      });
      toast.success('Test annulé');
      setCancelConfirmOpen(false);
      setTestToCancel(null);
      fetchTests();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  if (selectedTest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedTest(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Retour aux tests
          </button>
        </div>
        <h2 className="text-lg font-bold">{selectedTest.name}</h2>
        <TestResultView test={selectedTest} onUpdate={fetchTests} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Tests A/B</h2>
          <p className="text-sm text-muted-foreground">Comparez les performances de vos contenus</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Données de démo
          </Button>
          <CreateTestDialog onCreated={fetchTests} externalOpen={showCreateTest} onExternalOpenChange={(v) => setShowCreateTest(v)} />
        </div>
      </div>

      {tests.length === 0 ? (
        <Card className="border-border/50">
          <EmptyState
            icon={<GitCompareArrows className="w-6 h-6" />}
            title="Aucun test A/B"
            description="Comparez deux variantes pour optimiser votre contenu"
            action={{
              label: 'Créer un test',
              onClick: () => setShowCreateTest(true),
              icon: <Plus className="w-3.5 h-3.5" />,
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map(test => (
            <Card key={test.id} className="border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer" onClick={() => setSelectedTest(test)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{test.name}</h3>
                    {test.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{test.description}</p>}
                  </div>
                  <Badge className={cn('text-[10px] ml-2 shrink-0', AB_TEST_STATUS_COLORS[test.status as ABTestStatus])}>
                    {AB_TEST_STATUS_LABELS[test.status as ABTestStatus]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-[10px] text-blue-600 font-medium">Post A</p>
                    <p className="text-xs line-clamp-1">{test.postA?.subject || '-'}</p>
                  </div>
                  <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Post B</p>
                    <p className="text-xs line-clamp-1">{test.postB?.subject || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{AB_TEST_CRITERIA_LABELS[test.criteria as ABTestCriteria]}</Badge>
                    <span className="text-[10px] text-muted-foreground">{(test.readings?.length || 0)} données</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {test.status === 'draft' && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleStart(test.id); }}>
                        <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    )}
                    {test.status === 'running' && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleCancel(test.id); }}>
                        <Square className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      </Button>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {test.winnerId && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Gagnant : {test.winnerId === test.postAId ? 'Variante A' : 'Variante B'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Test Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce test A/B ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les résultats seront perdus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTestToCancel(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Annuler le test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
