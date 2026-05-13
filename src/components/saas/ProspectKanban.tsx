'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UserPlus,
  Phone,
  MessageCircle,
  ThumbsUp,
  CheckCircle2,
  Building2,
  Clock,
  ExternalLink,
  Star,
  X,
} from 'lucide-react';
import type { Prospect } from '@/types';

const KANBAN_COLUMNS: {
  status: string;
  label: string;
  icon: React.ElementType;
  bgClass: string;
  borderClass: string;
}[] = [
  {
    status: 'new',
    label: 'Nouveau',
    icon: UserPlus,
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    borderClass: 'border-t-slate-400',
  },
  {
    status: 'contacted',
    label: 'Contacté',
    icon: Phone,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    borderClass: 'border-t-blue-400',
  },
  {
    status: 'replied',
    label: 'Répondu',
    icon: MessageCircle,
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    borderClass: 'border-t-violet-400',
  },
  {
    status: 'interested',
    label: 'Intéressé',
    icon: ThumbsUp,
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    borderClass: 'border-t-amber-400',
  },
  {
    status: 'converted',
    label: 'Converti',
    icon: CheckCircle2,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderClass: 'border-t-emerald-400',
  },
];

function getScoreBadge(score: number) {
  if (score >= 70) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] h-5 px-1.5">
        {score}
      </Badge>
    );
  }
  if (score >= 40) {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] h-5 px-1.5">
        {score}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] h-5 px-1.5">
      {score}
    </Badge>
  );
}

function getScoreColor(score: number) {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Jamais';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDay === 0) return "Aujourd'hui";
  if (diffDay === 1) return 'Hier';
  if (diffDay < 7) return `il y a ${diffDay}j`;
  if (diffDay < 30) return `il y a ${Math.floor(diffDay / 7)}sem`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function ProspectCard({
  prospect,
  onClick,
}: {
  prospect: Prospect;
  onClick: () => void;
}) {
  const initials = prospect.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all border border-border/50 hover:border-border group"
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header: Avatar + Name + Score */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {prospect.fullName}
            </p>
            {prospect.company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{prospect.company}</span>
              </div>
            )}
          </div>
          {getScoreBadge(prospect.score)}
        </div>

        {/* Footer: Last contacted */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeDate(prospect.lastContactedAt)}</span>
          </div>
          {prospect.title && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                  {prospect.title}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{prospect.title}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProspectDetailDialog({
  prospect,
  open,
  onOpenChange,
}: {
  prospect: Prospect | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!prospect) return null;

  const initials = prospect.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {initials}
            </div>
            <div>
              <span>{prospect.fullName}</span>
              {prospect.company && (
                <p className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {prospect.company}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Score */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">Score de prospection</span>
            <div className="flex items-center gap-2">
              <Star className={cn('w-4 h-4', getScoreColor(prospect.score))} />
              <span className={cn('text-lg font-bold', getScoreColor(prospect.score))}>
                {prospect.score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {prospect.title && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Titre</p>
                <p className="text-sm font-medium">{prospect.title}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Statut</p>
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  prospect.status === 'new' && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                  prospect.status === 'contacted' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                  prospect.status === 'replied' && 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
                  prospect.status === 'interested' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                  prospect.status === 'converted' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                  prospect.status === 'not_interested' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                )}
              >
                {prospect.status === 'new' && 'Nouveau'}
                {prospect.status === 'contacted' && 'Contacté'}
                {prospect.status === 'replied' && 'Répondu'}
                {prospect.status === 'interested' && 'Intéressé'}
                {prospect.status === 'converted' && 'Converti'}
                {prospect.status === 'not_interested' && 'Pas intéressé'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dernier contact</p>
              <p className="text-sm font-medium">{formatRelativeDate(prospect.lastContactedAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Source</p>
              <p className="text-sm font-medium">
                {prospect.source === 'manual' && 'Manuel'}
                {prospect.source === 'linkedin_search' && 'Recherche LinkedIn'}
                {prospect.source === 'recommendation' && 'Recommandation'}
                {prospect.source === 'import' && 'Import CSV'}
              </p>
            </div>
          </div>

          {/* Notes */}
          {prospect.notes && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</p>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {prospect.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          {prospect.linkedinUrl && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open(prospect.linkedinUrl, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Voir le profil LinkedIn
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProspectKanban() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{
        prospects: Prospect[];
        statusCounts: Record<string, number>;
      }>('/api/prospects?limit=100&sortBy=updatedAt&sortOrder=desc');
      setProspects(data.prospects);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des prospects');
      console.error('Prospects kanban error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  // Group prospects by status
  const groupedProspects = KANBAN_COLUMNS.map((col) => ({
    ...col,
    prospects: prospects.filter((p) => p.status === col.status),
  }));

  // Count totals
  const totalProspects = prospects.length;
  const convertedCount = prospects.filter((p) => p.status === 'converted').length;
  const conversionRate = totalProspects > 0 ? Math.round((convertedCount / totalProspects) * 100) : 0;
  const avgScore = totalProspects > 0
    ? Math.round(prospects.reduce((sum, p) => sum + p.score, 0) / totalProspects)
    : 0;

  const handleProspectClick = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <X className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchProspects} className="mt-4">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Pipeline Prospects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vue Kanban de votre tunnel de prospection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{totalProspects}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400">Conversion:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{conversionRate}%</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">Score moy.:</span>
            <span className={cn('font-semibold', getScoreColor(avgScore))}>{avgScore}</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {groupedProspects.map((column) => {
          const ColumnIcon = column.icon;
          return (
            <div
              key={column.status}
              className="w-72 shrink-0 flex flex-col"
            >
              {/* Column Header */}
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-t-lg border-t-4',
                  column.borderClass,
                  column.bgClass
                )}
              >
                <ColumnIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{column.label}</span>
                <Badge
                  variant="secondary"
                  className="ml-auto h-5 min-w-[24px] px-1.5 text-[11px] font-semibold"
                >
                  {column.prospects.length}
                </Badge>
              </div>

              {/* Column Content */}
              <div className="flex-1 min-h-[200px] bg-muted/30 rounded-b-lg border border-border/30 border-t-0">
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[200px]">
                  <div className="p-2 space-y-2">
                    {column.prospects.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <p className="text-xs text-muted-foreground/50">Aucun prospect</p>
                      </div>
                    ) : (
                      column.prospects
                        .sort((a, b) => b.score - a.score)
                        .map((prospect) => (
                          <ProspectCard
                            key={prospect.id}
                            prospect={prospect}
                            onClick={() => handleProspectClick(prospect)}
                          />
                        ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          );
        })}
      </div>

      {/* Prospect Detail Dialog */}
      <ProspectDetailDialog
        prospect={selectedProspect}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
