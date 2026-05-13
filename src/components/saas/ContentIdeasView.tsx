'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Clock, Plus, Loader2, TrendingUp, TrendingDown, ChevronRight,
  Trash2, ThumbsUp, CalendarPlus, MessageSquare, AlertTriangle,
  Sparkles, Target, CheckCircle2, BarChart3, Eye, ArrowRight, RefreshCw,
  Lightbulb, Pencil, CheckCircle, HelpCircle, Frown, Meh, SmilePlus, Brain,
} from 'lucide-react';
import EmptyState from './EmptyState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ContentIdea, AudienceInsight, AudienceComment } from '@/types';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const FORMAT_LABELS: Record<string, string> = {
  listicle: 'Listicle',
  storytelling: 'Storytelling',
  thought_leadership: 'Thought Leadership',
  howto: 'Guide Pratique',
  controverse: 'Controverse',
  general: 'Général',
  engagement: 'Engagement',
};

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idée',
  assigned: 'Assigné',
  in_progress: 'En cours',
  published: 'Publié',
};

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  assigned: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  in_progress: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  question: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positif',
  negative: 'Négatif',
  neutral: 'Neutre',
  question: 'Question',
};

function AddIdeaDialog({ onCreated, externalOpen, onExternalOpenChange }: { onCreated: () => void; externalOpen?: boolean; onExternalOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const controlled = externalOpen !== undefined;
  const open = controlled ? externalOpen : internalOpen;
  const setOpen = controlled ? (v: boolean) => onExternalOpenChange?.(v) : setInternalOpen;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestedFormat, setSuggestedFormat] = useState('');
  const [suggestedAngle, setSuggestedAngle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Titre requis'); return; }
    setSaving(true);
    try {
      await apiFetch('/api/content-ideas', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, suggestedFormat: suggestedFormat || undefined, suggestedAngle: suggestedAngle.trim() || undefined, priority, source: 'manual' }),
      });
      toast.success('Idée créée');
      setOpen(false);
      setTitle(''); setDescription(''); setSuggestedFormat(''); setSuggestedAngle(''); setPriority('medium');
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
          Nouvelle idée
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle idée de contenu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Titre *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Guide IA pour débutants" disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Détaillez l'idée..." disabled={saving} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Format suggéré</Label>
              <Select value={suggestedFormat} onValueChange={setSuggestedFormat} disabled={saving}>
                <SelectTrigger><SelectValue placeholder="Format..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMAT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Priorité</Label>
              <Select value={priority} onValueChange={v => setPriority(v as 'high' | 'medium' | 'low')} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Angle suggéré</Label>
            <Textarea value={suggestedAngle} onChange={e => setSuggestedAngle(e.target.value)} rows={2} placeholder="Angle rédactionnel..." disabled={saving} />
          </div>
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
            Créer l&apos;idée
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IdeaCard({ idea, onUpdated, onDeleted }: { idea: ContentIdea; onUpdated: () => void; onDeleted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleUpvote = async () => {
    setUpvoting(true);
    try {
      await apiFetch(`/api/content-ideas/${idea.id}?id=${idea.id}`, { method: 'PUT', body: JSON.stringify({ upvotes: idea.upvotes + 1 }) });
      onUpdated();
    } catch {
      // silent
    } finally {
      setUpvoting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await apiFetch(`/api/content-ideas/${idea.id}?id=${idea.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      onUpdated();
      toast.success('Statut mis à jour');
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    setDeleteConfirmOpen(false);
    try {
      await apiFetch(`/api/content-ideas/${idea.id}?id=${idea.id}`, { method: 'DELETE' });
      onDeleted();
      toast.success('Idée supprimée');
    } catch {
      // silent
    }
  };

  const handleCreatePost = () => {
    const data: Record<string, string> = {};
    if (idea.title) data.prefill_subject = idea.title;
    if (idea.suggestedAngle) data.prefill_angle = idea.suggestedAngle;
    if (idea.suggestedFormat) data.prefill_format = idea.suggestedFormat;
    Object.entries(data).forEach(([k, v]) => sessionStorage.setItem(k, v));
    const { setView } = useAppStore.getState();
    setView('create-post');
    toast.success('Données pré-remplies dans le formulaire');
  };

  const statusOrder = ['idea', 'assigned', 'in_progress', 'published'];
  const currentIdx = statusOrder.indexOf(idea.status);
  const nextStatus = currentIdx < statusOrder.length - 1 ? statusOrder[currentIdx + 1] : null;
  const prevStatus = currentIdx > 0 ? statusOrder[currentIdx - 1] : null;

  return (
    <Card
      className={cn('border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer')}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{idea.title}</p>
            {idea.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{idea.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={e => { e.stopPropagation(); setDeleteConfirmOpen(true); }}>
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette idée ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {idea.suggestedFormat && (
            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {FORMAT_LABELS[idea.suggestedFormat] || idea.suggestedFormat}
            </Badge>
          )}
          <Badge variant="secondary" className={cn('text-[10px]', PRIORITY_COLORS[idea.priority])}>
            {idea.priority === 'high' ? 'Haute' : idea.priority === 'medium' ? 'Moyenne' : 'Basse'}
          </Badge>
          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {idea.source === 'audience_feedback' ? (<span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Audience</span>) : idea.source === 'manual' ? (<span className="flex items-center gap-1"><Pencil className="w-3 h-3" /> Manuel</span>) : idea.source}
          </Badge>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-3" onClick={e => e.stopPropagation()}>
            {idea.suggestedAngle && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Angle :</span> {idea.suggestedAngle}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleUpvote} disabled={upvoting} className="gap-1 h-7 text-xs">
                <ThumbsUp className="w-3 h-3" />
                {idea.upvotes}
              </Button>
              {prevStatus && (
                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(prevStatus)} className="gap-1 h-7 text-xs">
                  ← {STATUS_LABELS[prevStatus]}
                </Button>
              )}
              {nextStatus && (
                <Button variant="ghost" size="sm" onClick={() => handleStatusChange(nextStatus)} className="gap-1 h-7 text-xs">
                  {STATUS_LABELS[nextStatus]} →
                </Button>
              )}
              <Button size="sm" onClick={handleCreatePost} className="gap-1 h-7 text-xs ml-auto">
                <Plus className="w-3 h-3" />
                Créer un post
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Audience Insights Panel
   ============================================================ */
function AudienceInsightsPanel() {
  const [insights, setInsights] = useState<AudienceInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ insights: AudienceInsight | null }>('/api/audience/insights');
      setInsights(data.insights);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collapsed) fetchInsights();
  }, [collapsed, fetchInsights]);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AudienceInsight>('/api/audience/insights', { method: 'POST' });
      setInsights(data);
      toast.success('Analyse terminée et idées de contenu générées');
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Insights Audience
          </CardTitle>
          <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', !collapsed && 'rotate-90')} />
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Lancer l&apos;analyse
            </Button>
          </div>

          {loading && <Skeleton className="h-[200px]" />}

          {!loading && !insights && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Lancez l&apos;analyse pour découvrir les insights de votre audience.
            </p>
          )}

          {!loading && insights && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Commentaires</p>
                  <p className="text-lg font-bold">{insights.totalComments}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Moy./post</p>
                  <p className="text-lg font-bold">{insights.avgCommentsPerPost}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Questions</p>
                  <p className="text-lg font-bold">{insights.questions.length}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">Points doul.</p>
                  <p className="text-lg font-bold">{insights.painPoints.length}</p>
                </div>
              </div>

              {/* Sentiment distribution */}
              <div>
                <p className="text-xs font-semibold mb-2">Sentiment</p>
                <div className="flex gap-2 h-4 rounded-full overflow-hidden">
                  {insights.sentimentDistribution.positive > 0 && (
                    <div className="bg-emerald-500 rounded-l-full" style={{ width: `${insights.sentimentDistribution.positive * 100}%` }} />
                  )}
                  {insights.sentimentDistribution.neutral > 0 && (
                    <div className="bg-slate-400" style={{ width: `${insights.sentimentDistribution.neutral * 100}%` }} />
                  )}
                  {insights.sentimentDistribution.question > 0 && (
                    <div className="bg-amber-500" style={{ width: `${insights.sentimentDistribution.question * 100}%` }} />
                  )}
                  {insights.sentimentDistribution.negative > 0 && (
                    <div className="bg-red-500 rounded-r-full" style={{ width: `${insights.sentimentDistribution.negative * 100}%` }} />
                  )}
                </div>
                <div className="flex gap-4 mt-1.5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><SmilePlus className="w-3 h-3" /> {Math.round(insights.sentimentDistribution.positive * 100)}%</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><Meh className="w-3 h-3" /> {Math.round(insights.sentimentDistribution.neutral * 100)}%</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><HelpCircle className="w-3 h-3" /> {Math.round(insights.sentimentDistribution.question * 100)}%</span>
                  <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-0.5"><Frown className="w-3 h-3" /> {Math.round(insights.sentimentDistribution.negative * 100)}%</span>
                </div>
              </div>

              {/* Top questions */}
              {insights.questions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2">Questions récurrentes</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {insights.questions.slice(0, 5).map((q, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
                        <MessageSquare className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">{q.question}</p>
                          {q.frequency > 1 && (
                            <Badge variant="secondary" className="text-[9px] mt-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                              ×{q.frequency}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pain points */}
              {insights.painPoints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-500 dark:text-red-400" />
                    Points de friction
                  </p>
                  <div className="space-y-1.5">
                    {insights.painPoints.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/50">
                        <span className="text-xs flex-1">{p.point}</span>
                        <Badge variant="secondary" className="text-[9px] bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                          ×{p.frequency}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top commenters */}
              {insights.topCommenters.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2">Top commenteurs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.topCommenters.slice(0, 5).map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {c.name} ({c.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ContentIdeasView() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddIdea, setShowAddIdea] = useState(false);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const data = await apiFetch<{ ideas: ContentIdea[] }>(`/api/content-ideas${params}`);
      setIdeas(data.ideas);
    } catch {}
    finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  const handleSeed = async () => {
    try {
      await apiFetch('/api/content-ideas/seed', { method: 'POST' });
      toast.success('Données de démo créées');
      await fetchIdeas();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };


  const ideaCount = ideas.length;
  const ideaColumns = {
    idea: ideas.filter(i => i.status === 'idea'),
    in_progress: ideas.filter(i => i.status === 'in_progress' || i.status === 'assigned'),
    published: ideas.filter(i => i.status === 'published'),
  };

  const priorityCount = (p: string) => ideas.filter(i => i.priority === p).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Idées de contenu</h2>
          <p className="text-sm text-muted-foreground">Pipeline de création de contenu basé sur l&apos;audience</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Données de démo
          </Button>
          <AddIdeaDialog onCreated={fetchIdeas} externalOpen={showAddIdea} onExternalOpenChange={(v) => setShowAddIdea(v)} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total idées</p>
            <p className="text-xl font-bold">{ideaCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">En attente</p>
            <p className="text-xl font-bold">{ideaColumns.idea.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">En cours</p>
            <p className="text-xl font-bold">{ideaColumns.in_progress.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Publiées</p>
            <p className="text-xl font-bold">{ideaColumns.published.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Haute priorité</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{priorityCount('high')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {['all', 'idea', 'in_progress', 'published'].map(s => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)} className="text-xs h-8">
            {s === 'all' ? 'Toutes' : STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[100px]" />)}
        </div>
      ) : ideaCount === 0 && filterStatus === 'all' ? (
        <EmptyState
          icon={<Lightbulb className="w-6 h-6" />}
          title="Aucune idée de contenu"
          description="Capturez vos idées de publication"
          action={{
            label: 'Ajouter une idée',
            onClick: () => setShowAddIdea(true),
            icon: <Plus className="w-3.5 h-3.5" />,
          }}
        />
      ) : (
        <div className="space-y-8">
          {/* Ideas Columns */}
          {Object.entries(ideaColumns).map(([status, items]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className={cn('text-xs', STATUS_COLORS[status])}>
                  {STATUS_LABELS[status]}
                </Badge>
                <span className="text-xs text-muted-foreground">{items.length} idée{items.length !== 1 ? 's' : ''}</span>
              </div>
              {items.length === 0 ? (
                <Card className="border-border/50 border-dashed">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Aucune idée dans cette catégorie
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {items.map(idea => (
                    <IdeaCard key={idea.id} idea={idea} onUpdated={fetchIdeas} onDeleted={fetchIdeas} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Audience Insights Panel */}
      <AudienceInsightsPanel />
    </div>
  );
}
