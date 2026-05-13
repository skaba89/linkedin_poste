'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  RefreshCw,
  Ear,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Check,
  BarChart3,
  Search,
  Zap,
  Filter,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import EmptyState from './EmptyState';
import type { TrackedKeyword, SocialMention, SocialListenerStats, TrackedKeywordCategory } from '@/types';
import { KEYWORD_CATEGORY_LABELS, KEYWORD_CATEGORY_COLORS, SENTIMENT_LABELS, SENTIMENT_COLORS } from '@/types';

const PIE_COLORS = ['#10b981', '#ef4444', '#64748b'];

/* ============================================================
   Add Keyword Dialog
   ============================================================ */
function AddKeywordDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<TrackedKeywordCategory>('brand');

  const handleCreate = async () => {
    if (!keyword.trim()) { toast.error('Le mot-clé est requis'); return; }
    setSaving(true);
    try {
      await apiFetch('/api/social-listener/keywords', {
        method: 'POST',
        body: JSON.stringify({ keyword: keyword.trim(), category }),
      });
      toast.success('Mot-clé ajouté');
      setOpen(false);
      setKeyword('');
      setCategory('brand');
      onCreated();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un mot-clé</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mot-clé</Label>
            <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="ex: DataSphere, marketing IA..." />
          </div>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={(v: TrackedKeywordCategory) => setCategory(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(KEYWORD_CATEGORY_LABELS) as [TrackedKeywordCategory, string][]).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Mention Card
   ============================================================ */
function MentionCard({
  mention,
  onMarkReplied,
  onDelete,
}: {
  mention: SocialMention;
  onMarkReplied: () => void;
  onDelete: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleMarkReplied = async () => {
    try {
      await apiFetch(`/api/social-listener/mentions/${mention.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isReplied: true }),
      });
      toast.success('Marqué comme répondu');
      onMarkReplied();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/social-listener/mentions/${mention.id}`, { method: 'DELETE' });
      toast.success('Mention supprimée');
      onDelete();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  return (
    <Card className={cn(
      'border-border/50 transition-all',
      mention.sentiment === 'negative' && 'border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/5',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Author & keyword */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {mention.authorName && (
                <span className="text-xs font-semibold text-foreground">{mention.authorName}</span>
              )}
              {mention.source && (
                <Badge variant="outline" className="text-[9px]">{mention.source}</Badge>
              )}
              <Badge variant="secondary" className="text-[9px]">#{mention.keyword}</Badge>
              {mention.sentiment && (
                <Badge className={cn('text-[9px]', SENTIMENT_COLORS[mention.sentiment])}>
                  {mention.sentiment === 'negative' && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
                  {SENTIMENT_LABELS[mention.sentiment]}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(mention.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Content */}
            <p className="text-sm leading-relaxed mb-2">{mention.content}</p>

            {/* Score */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>Pertinence : <strong className="text-foreground">{mention.relevanceScore}/100</strong></span>
              {mention.isReplied && (
                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Check className="w-2.5 h-2.5 mr-1" />Répondu
                </Badge>
              )}
            </div>

            {/* Suggested reply */}
            {(mention.suggestedReply || showReply) && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Réponse suggérée
                </p>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{mention.suggestedReply}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          {!mention.isReplied && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleMarkReplied}>
              <Check className="w-3 h-3" />
              Répondre
            </Button>
          )}
          {mention.postUrl && (
            <a href={mention.postUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <ExternalLink className="w-3 h-3" />
                Voir
              </Button>
            </a>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette mention ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ============================================================
   Stats Dashboard
   ============================================================ */
function StatsDashboard({ stats }: { stats: SocialListenerStats }) {
  const pieData = [
    { name: 'Positif', value: stats.positiveCount },
    { name: 'Négatif', value: stats.negativeCount },
    { name: 'Neutre', value: stats.neutralCount },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Total mentions</p>
            <p className="text-xl font-bold">{stats.totalMentions}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Positives</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.positiveCount}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-red-600 dark:text-red-400">Négatives</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.negativeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Répondues</p>
            <p className="text-xl font-bold">{stats.repliedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volume trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Volume de mentions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {stats.volumeTrend.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Aucune donnée
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.volumeTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" name="Mentions" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment pie */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Répartition du sentiment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {pieData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Aucune donnée
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top keywords */}
      {stats.topKeywords.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Search className="w-4 h-4 text-muted-foreground" />
              Mots-clés les plus mentionnés
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {stats.topKeywords.map((kw, i) => (
                <Badge
                  key={kw.keyword}
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                >
                  #{kw.keyword}
                  <span className="ml-1.5 font-mono text-muted-foreground">({kw.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
   Main SocialListenerView
   ============================================================ */
export default function SocialListenerView() {
  const [keywords, setKeywords] = useState<TrackedKeyword[]>([]);
  const [mentions, setMentions] = useState<SocialMention[]>([]);
  const [stats, setStats] = useState<SocialListenerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<string>('all');
  const [filterKeyword, setFilterKeyword] = useState<string>('all');

  const fetchKeywords = useCallback(async () => {
    try {
      const data = await apiFetch<{ keywords: TrackedKeyword[] }>('/api/social-listener/keywords');
      setKeywords(data.keywords);
    } catch { /* silent */ }
  }, []);

  const fetchMentions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (filterSentiment !== 'all') params.set('sentiment', filterSentiment);
      if (filterKeyword !== 'all') params.set('keyword', filterKeyword);
      const data = await apiFetch<{ mentions: SocialMention[] }>(`/api/social-listener/mentions?${params}`);
      setMentions(data.mentions);
    } catch { /* silent */ }
  }, [filterSentiment, filterKeyword]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<SocialListenerStats>('/api/social-listener/stats');
      setStats(data);
    } catch { /* silent */ }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchKeywords(), fetchMentions(), fetchStats()]);
    setLoading(false);
  }, [fetchKeywords, fetchMentions, fetchStats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const data = await apiFetch<{ message: string; count: number } & { mentions: SocialMention[] }>('/api/social-listener/scan', { method: 'POST' });
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setScanning(false);
    }
  };

  const handleToggleKeyword = async (kw: TrackedKeyword) => {
    try {
      await apiFetch(`/api/social-listener/keywords/${kw.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !kw.isActive }),
      });
      toast.success(kw.isActive ? 'Mot-clé désactivé' : 'Mot-clé activé');
      fetchKeywords();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      await apiFetch(`/api/social-listener/keywords/${id}`, { method: 'DELETE' });
      toast.success('Mot-clé supprimé');
      setDeleteId(null);
      fetchKeywords();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-[300px]" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Ear className="w-5 h-5" />
            Social Listening
          </h2>
          <p className="text-sm text-muted-foreground">Surveillez les mentions de votre marque et réagissez en temps réel</p>
        </div>
        <Button onClick={handleScan} disabled={scanning || keywords.filter(k => k.isActive).length === 0} className="gap-1.5">
          {scanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          {scanning ? 'Analyse en cours...' : 'Scanner maintenant'}
        </Button>
      </div>

      <Tabs defaultValue="mentions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mentions" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Mentions ({mentions.length})
          </TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Mots-clés ({keywords.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        {/* Mentions Tab */}
        <TabsContent value="mentions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterSentiment} onValueChange={setFilterSentiment}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Sentiment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les sentiments</SelectItem>
                <SelectItem value="positive">Positif</SelectItem>
                <SelectItem value="negative">Négatif</SelectItem>
                <SelectItem value="neutral">Neutre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterKeyword} onValueChange={setFilterKeyword}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Mot-clé" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mots-clés</SelectItem>
                {keywords.filter(k => k.isActive).map(kw => (
                  <SelectItem key={kw.id} value={kw.keyword}>#{kw.keyword}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mentions feed */}
          {mentions.length === 0 ? (
            <Card className="border-border/50">
              <EmptyState
                icon={<Ear className="w-6 h-6" />}
                title="Aucune mention trouvée"
                description="Lancez un scan pour découvrir les mentions de vos mots-clés"
                action={{
                  label: 'Scanner maintenant',
                  onClick: handleScan,
                  icon: <Zap className="w-3.5 h-3.5" />,
                }}
              />
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {mentions.map(m => (
                <MentionCard
                  key={m.id}
                  mention={m}
                  onMarkReplied={fetchMentions}
                  onDelete={fetchMentions}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Mots-clés suivis ({keywords.length})</h3>
            <AddKeywordDialog onCreated={fetchKeywords} />
          </div>

          {keywords.length === 0 ? (
            <Card className="border-border/50">
              <EmptyState
                icon={<Search className="w-6 h-6" />}
                title="Aucun mot-clé configuré"
                description="Ajoutez des mots-clés pour commencer la surveillance"
                action={{
                  label: 'Ajouter un mot-clé',
                  onClick: () => {},
                  icon: <Plus className="w-3.5 h-3.5" />,
                }}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {keywords.map(kw => (
                <Card key={kw.id} className={cn('border-border/50', !kw.isActive && 'opacity-60')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">#{kw.keyword}</span>
                          <Badge className={cn('text-[9px]', KEYWORD_CATEGORY_COLORS[kw.category as TrackedKeywordCategory])}>
                            {KEYWORD_CATEGORY_LABELS[kw.category as TrackedKeywordCategory]}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Ajouté le {new Date(kw.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={kw.isActive}
                          onCheckedChange={() => handleToggleKeyword(kw)}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setDeleteId(kw.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          {stats ? <StatsDashboard stats={stats} /> : <Skeleton className="h-[400px]" />}
        </TabsContent>
      </Tabs>

      {/* Delete keyword confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce mot-clé ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Les mentions existantes seront conservées.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDeleteKeyword(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
