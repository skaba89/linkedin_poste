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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  RefreshCw,
  UserPlus,
  Sparkles,
  Send,
  Eye,
  EyeOff,
  ExternalLink,
  Target,
  Users,
  CheckCircle,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Zap,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import EmptyState from './EmptyState';
import type { ConnectionTarget, ConnectionTargetStatus, NetworkingStats } from '@/types';
import { CONNECTION_STATUS_LABELS, CONNECTION_STATUS_COLORS } from '@/types';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#22c55e', '#64748b', '#ef4444'];

/* ============================================================
   Connection Message Preview Dialog
   ============================================================ */
function ConnectDialog({
  target,
  onSent,
  open,
  onOpenChange,
}: {
  target: ConnectionTarget;
  onSent: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage('');
    }
  }, [open]);

  const handleConnect = async () => {
    setSending(true);
    try {
      const data = await apiFetch<{ target: ConnectionTarget; message: string }>('/api/networking/connect', {
        method: 'POST',
        body: JSON.stringify({ targetId: target.id, message: message || undefined }),
      });
      toast.success('Invitation envoyée avec succès !');
      onOpenChange(false);
      onSent();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer une invitation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{target.targetName || 'Profil inconnu'}</p>
              {target.targetHeadline && <p className="text-xs text-muted-foreground truncate">{target.targetHeadline}</p>}
              {target.targetCompany && <p className="text-xs text-muted-foreground">{target.targetCompany}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message personnalisé (optionnel)</Label>
            <p className="text-[10px] text-muted-foreground">Laissez vide pour utiliser un message généré par l'IA</p>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="Rédigez votre message d'invitation..."
              className="text-sm"
            />
          </div>

          <Button onClick={handleConnect} disabled={sending} className="w-full gap-1.5">
            {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Networking Stats Dashboard
   ============================================================ */
function NetworkingStatsView({ stats }: { stats: NetworkingStats }) {
  const pieData = stats.bySector.map(s => ({ name: s.sector, value: s.count }));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Invitations envoyées</p>
            <p className="text-xl font-bold">{stats.connectionSent}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Connectés</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.connected}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-amber-600 dark:text-amber-400">Répondues</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.replied}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Taux d'acceptation</p>
            <p className="text-xl font-bold">{stats.acceptanceRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar + by sector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly goal */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Target className="w-4 h-4 text-muted-foreground" />
              Objectif hebdomadaire
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{stats.weeklyGoal.current} / {stats.weeklyGoal.target} connexions</span>
              <span className="font-semibold">{Math.round((stats.weeklyGoal.current / stats.weeklyGoal.target) * 100)}%</span>
            </div>
            <Progress value={Math.min(100, (stats.weeklyGoal.current / stats.weeklyGoal.target) * 100)} className="h-3" />
            {stats.weeklyGoal.current >= stats.weeklyGoal.target && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                <CheckCircle className="w-3.5 h-3.5" />
                Objectif atteint !
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sector distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Par secteur
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
                      innerRadius={45}
                      outerRadius={75}
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

      {/* Message templates */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            Modèles de messages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Professionnel</p>
            <p className="text-xs text-foreground/80">Bonjour {`{prénom}`}, j'ai remarqué votre profil et votre expertise en {`{domaine}`}. Je pense que nos entreprises pourraient avoir des synergies intéressantes...</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Dynamique</p>
            <p className="text-xs text-foreground/80">Salut {`{prénom}`} ! Votre parcours chez {`{entreprise}`} est vraiment impressionnant. Je serais ravi d'échanger sur les tendances de notre secteur...</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Direct</p>
            <p className="text-xs text-foreground/80">{`{prénom}`}, je me permets de vous contacter suite à notre intérêt commun pour {`{sujet}`}. Accepteriez-vous de nous connecter ?</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Main NetworkingView
   ============================================================ */
export default function NetworkingView() {
  const [targets, setTargets] = useState<ConnectionTarget[]>([]);
  const [stats, setStats] = useState<NetworkingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<ConnectionTarget | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');

  const fetchTargets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('sortBy', 'relevanceScore');
      params.set('sortOrder', 'desc');
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterSector !== 'all') params.set('sector', filterSector);
      const data = await apiFetch<{ targets: ConnectionTarget[] }>(`/api/networking/targets?${params}`);
      setTargets(data.targets);
    } catch { /* silent */ }
  }, [filterStatus, filterSector]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<NetworkingStats>('/api/networking/stats');
      setStats(data);
    } catch { /* silent */ }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTargets(), fetchStats()]);
    setLoading(false);
  }, [fetchTargets, fetchStats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const data = await apiFetch<{ message: string; count: number; profiles: ConnectionTarget[] }>('/api/networking/discover', {
        method: 'POST',
        body: JSON.stringify({ count: 5 }),
      });
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setDiscovering(false);
    }
  };

  const handleBatchConnect = async () => {
    setBatchSending(true);
    try {
      const data = await apiFetch<{ message: string; count: number }>('/api/networking/batch', {
        method: 'POST',
        body: JSON.stringify({ count: 5 }),
      });
      toast.success(data.message);
      fetchAll();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setBatchSending(false);
    }
  };

  const handleIgnore = async (id: string) => {
    try {
      await apiFetch(`/api/networking/targets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ignored' }),
      });
      toast.success('Cible ignorée');
      fetchTargets();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiFetch(`/api/networking/targets/${deleteId}`, { method: 'DELETE' });
      toast.success('Cible supprimée');
      setDeleteId(null);
      fetchTargets();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    }
  };

  const identifiedCount = targets.filter(t => t.status === 'identified').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Networking IA
          </h2>
          <p className="text-sm text-muted-foreground">Découvrez et connectez-vous avec les bons profils automatiquement</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDiscover} disabled={discovering} variant="outline" className="gap-1.5">
            {discovering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Découvrir des profils
          </Button>
          {identifiedCount > 0 && (
            <Button onClick={handleBatchConnect} disabled={batchSending} className="gap-1.5">
              {batchSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Connecter ({identifiedCount})
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="targets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="targets" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Cibles ({targets.length})
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        {/* Targets Tab */}
        <TabsContent value="targets" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {(Object.entries(CONNECTION_STATUS_LABELS) as [ConnectionTargetStatus, string][]).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Secteur" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les secteurs</SelectItem>
                {stats?.bySector.map(s => (
                  <SelectItem key={s.sector} value={s.sector}>{s.sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Targets table */}
          {targets.length === 0 ? (
            <Card className="border-border/50">
              <EmptyState
                icon={<UserPlus className="w-6 h-6" />}
                title="Aucune cible de networking"
                description="Utilisez l'IA pour découvrir des profils pertinents à contacter"
                action={{
                  label: 'Découvrir des profils',
                  onClick: handleDiscover,
                  icon: <Sparkles className="w-3.5 h-3.5" />,
                }}
              />
            </Card>
          ) : (
            <Card className="border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground">Profil</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">Entreprise</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Secteur</th>
                      <th className="text-center py-2.5 px-4 text-xs font-semibold text-muted-foreground">Score</th>
                      <th className="text-center py-2.5 px-4 text-xs font-semibold text-muted-foreground">Statut</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(target => (
                      <tr key={target.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <UserPlus className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">{target.targetName || 'Inconnu'}</p>
                              {target.targetHeadline && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{target.targetHeadline}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{target.targetCompany || '-'}</span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {target.targetSector && (
                            <Badge variant="outline" className="text-[10px]">{target.targetSector}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cn(
                            'text-xs font-bold',
                            target.relevanceScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                            target.relevanceScore >= 60 ? 'text-amber-600 dark:text-amber-400' :
                            'text-muted-foreground'
                          )}>
                            {target.relevanceScore}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={cn('text-[9px]', CONNECTION_STATUS_COLORS[target.status as ConnectionTargetStatus])}>
                            {CONNECTION_STATUS_LABELS[target.status as ConnectionTargetStatus]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {target.status === 'identified' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] gap-1"
                                onClick={() => setConnectTarget(target)}
                              >
                                <Send className="w-3 h-3" />
                                Inviter
                              </Button>
                            )}
                            {target.messageSent && (
                              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setConnectTarget(target)}>
                                <Eye className="w-3 h-3" />
                                Voir
                              </Button>
                            )}
                            {target.targetProfileUrl && (
                              <a href={target.targetProfileUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </a>
                            )}
                            {target.status === 'identified' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                                onClick={() => handleIgnore(target.id)}
                                title="Ignorer"
                              >
                                <EyeOff className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteId(target.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          {stats ? <NetworkingStatsView stats={stats} /> : <Skeleton className="h-[400px]" />}
        </TabsContent>
      </Tabs>

      {/* Connect Dialog */}
      {connectTarget && (
        <ConnectDialog
          target={connectTarget}
          onSent={fetchAll}
          open={!!connectTarget}
          onOpenChange={(open) => { if (!open) setConnectTarget(null); }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette cible ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
