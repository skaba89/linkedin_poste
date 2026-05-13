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
  Sparkles,
  RefreshCw,
  Users,
  ExternalLink,
  TrendingUp,
  Trash2,
  Eye,
  ChevronLeft,
  BarChart3,
  Globe,
} from 'lucide-react';
import EmptyState from './EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { Competitor, CompetitorPost } from '@/types';

/* ============================================================
   Add Competitor Dialog
   ============================================================ */
function AddCompetitorDialog({ onCreated, externalOpen, onExternalOpenChange }: { onCreated: () => void; externalOpen?: boolean; onExternalOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const controlled = externalOpen !== undefined;
  const open = controlled ? externalOpen : internalOpen;
  const setOpen = controlled ? (v: boolean) => onExternalOpenChange?.(v) : setInternalOpen;
  const [name, setName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async () => {
    if (!name || !linkedinUrl) {
      toast.error('Nom et URL LinkedIn sont requis');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/competitors', {
        method: 'POST',
        body: JSON.stringify({ name, linkedinUrl, industry: industry || undefined, notes: notes || undefined }),
      });
      toast.success('Concurrent ajouté');
      setOpen(false);
      setName(''); setLinkedinUrl(''); setIndustry(''); setNotes('');
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
          Ajouter un concurrent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un concurrent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: TechCorp" />
          </div>
          <div className="space-y-2">
            <Label>URL LinkedIn</Label>
            <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/company/..." />
          </div>
          <div className="space-y-2">
            <Label>Industrie (optionnel)</Label>
            <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="ex: Tech, Marketing..." />
          </div>
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
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
   Add Competitor Post Dialog
   ============================================================ */
function AddPostDialog({ competitorId, onAdded }: { competitorId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [likes, setLikes] = useState('');
  const [comments, setComments] = useState('');
  const [reposts, setReposts] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async () => {
    if (!subject) { toast.error('Le sujet est requis'); return; }
    setSaving(true);
    try {
      await apiFetch(`/api/competitors/${competitorId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          subject,
          likes: Number(likes) || 0,
          comments: Number(comments) || 0,
          reposts: Number(reposts) || 0,
          notes: notes || undefined,
        }),
      });
      toast.success('Post ajouté');
      setOpen(false);
      setSubject(''); setLikes(''); setComments(''); setReposts(''); setNotes('');
      onAdded();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Ajouter un post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un post concurrent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sujet</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Likes</Label>
              <Input type="number" min="0" value={likes} onChange={e => setLikes(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Commentaires</Label>
              <Input type="number" min="0" value={comments} onChange={e => setComments(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reposts</Label>
              <Input type="number" min="0" value={reposts} onChange={e => setReposts(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Comparison Dashboard
   ============================================================ */
function ComparisonDashboard() {
  const [comparison, setComparison] = useState<{
    you: { name: string; postCount: number; avgEngagement: number; avgLikes: number; avgComments: number; avgImpressions: number };
    competitors: { id: string; name: string; industry?: string; postCount: number; avgEngagement: number; avgLikes: number; avgComments: number; postingFrequency: number }[];
  } | null>(null);

  useEffect(() => {
    apiFetch<typeof comparison>('/api/competitors/comparison')
      .then(data => setComparison(data))
      .catch(() => {});
  }, []);

  if (!comparison) {
    return <Skeleton className="h-[300px]" />;
  }

  const allEntities = [
    { name: comparison.you.name, avgEngagement: comparison.you.avgEngagement, avgLikes: comparison.you.avgLikes, avgComments: comparison.you.avgComments, postCount: comparison.you.postCount, isYou: true },
    ...comparison.competitors.map(c => ({ name: c.name, avgEngagement: c.avgEngagement, avgLikes: c.avgLikes, avgComments: c.avgComments, postCount: c.postCount, isYou: false })),
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Comparaison : Vous vs Concurrents</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allEntities}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="avgEngagement" name="Engagement moyen %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border/50">
              <tr>
                <th className="text-left py-2 px-2">Entité</th>
                <th className="text-right py-2 px-2">Posts</th>
                <th className="text-right py-2 px-2">Engagement %</th>
                <th className="text-right py-2 px-2">Likes moy.</th>
                <th className="text-right py-2 px-2">Comm. moy.</th>
              </tr>
            </thead>
            <tbody>
              {allEntities.map((entity, i) => (
                <tr key={i} className={cn('border-b border-border/30', entity.isYou ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : '')}>
                  <td className="py-2 px-2 font-medium">{entity.name} {entity.isYou && <Badge variant="secondary" className="text-[9px] ml-1">Vous</Badge>}</td>
                  <td className="text-right py-2 px-2">{entity.postCount || 0}</td>
                  <td className={cn('text-right py-2 px-2 font-semibold', entity.avgEngagement >= 3 ? 'text-emerald-600 dark:text-emerald-400' : entity.avgEngagement >= 1.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                    {entity.avgEngagement.toFixed(1)}%
                  </td>
                  <td className="text-right py-2 px-2">{Math.round(entity.avgLikes)}</td>
                  <td className="text-right py-2 px-2">{Math.round(entity.avgComments)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Competitor Detail Panel
   ============================================================ */
function CompetitorDetail({ competitor, onBack }: { competitor: Competitor; onBack: () => void }) {
  const [posts, setPosts] = useState<CompetitorPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(() => {
    apiFetch<{ posts: CompetitorPost[] }>(`/api/competitors/${competitor.id}/posts`)
      .then(data => { setPosts(data.posts); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [competitor.id]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const topPost = [...posts].sort((a, b) => b.engagementRate - a.engagementRate)[0];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" />
        Retour aux concurrents
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">{competitor.name}</h2>
          {competitor.industry && <Badge variant="outline" className="text-xs mt-1">{competitor.industry}</Badge>}
          {competitor.linkedinUrl && (
            <a href={competitor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
              <ExternalLink className="w-3 h-3" />
              Profil LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Posts suivis</p>
            <p className="text-xl font-bold">{competitor.postCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Engagement moyen</p>
            <p className="text-xl font-bold">{competitor.avgEngagement}%</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Dernier suivi</p>
            <p className="text-xs font-bold">{competitor.lastSyncedAt ? new Date(competitor.lastSyncedAt).toLocaleDateString('fr-FR') : '-'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Post */}
      {topPost && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-3">
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Meilleur post
            </p>
            <p className="text-xs font-medium">{topPost.subject}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {topPost.engagementRate}% engagement · {topPost.likes} likes · {topPost.comments} comm.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Posts ({posts.length})</h3>
          <AddPostDialog competitorId={competitor.id} onAdded={() => {
            apiFetch<{ posts: CompetitorPost[] }>(`/api/competitors/${competitor.id}/posts`)
              .then(data => setPosts(data.posts))
              .catch(() => {});
          }} />
        </div>

        {loading ? (
          <Skeleton className="h-40" />
        ) : posts.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p className="text-xs">Aucun post suivi</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {posts.map(post => (
              <Card key={post.id} className="border-border/50">
                <CardContent className="p-3">
                  <p className="text-xs font-medium line-clamp-2">{post.subject}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span>{post.likes} likes</span>
                    <span>{post.comments} comm.</span>
                    <span>{post.reposts} reposts</span>
                    <Badge variant="secondary" className={cn(
                      'text-[9px]',
                      post.engagementRate >= 3 ? 'bg-emerald-100 text-emerald-700' : post.engagementRate >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    )}>
                      {post.engagementRate}%
                    </Badge>
                  </div>
                  {post.publishedAt && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(post.publishedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompetitorWatchView() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [competitorToDelete, setCompetitorToDelete] = useState<string | null>(null);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ competitors: Competitor[] }>('/api/competitors');
      setCompetitors(data.competitors);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const handleSeed = async () => {
    try {
      const data = await apiFetch<{ seededCompetitors: number }>('/api/competitors/seed', { method: 'POST' });
      toast.success(`${data.seededCompetitors} concurrents de démo ajoutés`);
      fetchCompetitors();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompetitorToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!competitorToDelete) return;
    try {
      await apiFetch(`/api/competitors/${competitorToDelete}`, { method: 'DELETE' });
      toast.success('Concurrent supprimé');
      setDeleteConfirmOpen(false);
      setCompetitorToDelete(null);
      fetchCompetitors();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  if (selectedCompetitor) {
    return (
      <div className="space-y-4">
        <CompetitorDetail competitor={selectedCompetitor} onBack={() => { setSelectedCompetitor(null); fetchCompetitors(); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px]" />
        {[1, 2].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Veille Concurrentielle</h2>
          <p className="text-sm text-muted-foreground">Suivez et analysez les performances de vos concurrents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Données de démo
          </Button>
          <AddCompetitorDialog onCreated={fetchCompetitors} externalOpen={showAddCompetitor} onExternalOpenChange={(v) => setShowAddCompetitor(v)} />
        </div>
      </div>

      {/* Comparison */}
      <ComparisonDashboard />

      {/* Competitors list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Concurrents ({competitors.length})</h3>

        {competitors.length === 0 ? (
          <Card className="border-border/50">
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="Aucun concurrent suivi"
              description="Ajoutez des concurrents pour analyser leur stratégie"
              action={{
                label: 'Ajouter un concurrent',
                onClick: () => setShowAddCompetitor(true),
                icon: <Plus className="w-3.5 h-3.5" />,
              }}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map(comp => (
              <Card
                key={comp.id}
                className="border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedCompetitor(comp)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold truncate">{comp.name}</h4>
                          {comp.industry && <p className="text-[10px] text-muted-foreground">{comp.industry}</p>}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={e => handleDelete(comp.id, e)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="text-center p-2 rounded bg-muted/30">
                      <p className="text-[10px] text-muted-foreground">Posts</p>
                      <p className="text-sm font-bold">{comp.postCount}</p>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/30">
                      <p className="text-[10px] text-muted-foreground">Engagement</p>
                      <p className={cn('text-sm font-bold', (comp.avgEngagement ?? 0) >= 3 ? 'text-emerald-600 dark:text-emerald-400' : (comp.avgEngagement ?? 0) >= 1.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                        {comp.avgEngagement ?? 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce concurrent ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompetitorToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
