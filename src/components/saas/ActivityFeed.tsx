'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Bot,
  FileText,
  Bell,
  ShieldCheck,
  RefreshCw,
  Clock,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
} from 'lucide-react';

interface FeedItem {
  id: string;
  type: 'agent' | 'audit' | 'post' | 'notification';
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  userName?: string | null;
  createdAt: string;
}

const TYPE_CONFIG = {
  agent: {
    icon: Bot,
    label: 'Agent IA',
    bgClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    borderClass: 'border-l-violet-500',
    dotClass: 'bg-violet-500',
  },
  audit: {
    icon: ShieldCheck,
    label: 'Audit',
    bgClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    borderClass: 'border-l-slate-500',
    dotClass: 'bg-slate-500',
  },
  post: {
    icon: FileText,
    label: 'Post',
    bgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    borderClass: 'border-l-emerald-500',
    dotClass: 'bg-emerald-500',
  },
  notification: {
    icon: Bell,
    label: 'Notification',
    bgClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    borderClass: 'border-l-amber-500',
    dotClass: 'bg-amber-500',
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffHr < 24) return `il y a ${diffHr}h`;
  if (diffDay < 7) return `il y a ${diffDay}j`;
  if (diffDay < 30) return `il y a ${Math.floor(diffDay / 7)}sem`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getActivityIcon(type: string, metadata?: Record<string, unknown> | null) {
  if (type === 'agent' && metadata?.status) {
    const status = metadata.status as string;
    if (status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    if (status === 'executing') return <Zap className="w-3.5 h-3.5 text-blue-500" />;
    return <Activity className="w-3.5 h-3.5 text-violet-500" />;
  }
  if (type === 'post' && metadata?.status) {
    const status = metadata.status as string;
    if (status === 'posted') return <Send className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === 'scheduled') return <Clock className="w-3.5 h-3.5 text-blue-500" />;
    if (status === 'approved') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    return <FileText className="w-3.5 h-3.5" />;
  }
  if (type === 'notification') return <Bell className="w-3.5 h-3.5" />;
  return <ShieldCheck className="w-3.5 h-3.5" />;
}

export default function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await apiFetch<{
        items: FeedItem[];
        total: number;
      }>('/api/activity-feed?limit=50');
      setItems(data.items);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Erreur lors du chargement du feed');
      console.error('Activity feed error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeed();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  // Group by date
  const groupedItems = items.reduce<Record<string, FeedItem[]>>((groups, item) => {
    const date = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Hier';
    } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
      groupKey = 'Cette semaine';
    } else {
      groupKey = 'Plus ancien';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});

  // Count by type
  const typeCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">{error}</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Impossible de charger le feed d&apos;activité
          </p>
          <Button variant="outline" size="sm" onClick={fetchFeed}>
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Feed d&apos;activité</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Activités récentes de votre équipe
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Type summary badges */}
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            if (!typeCounts[type]) return null;
            return (
              <Badge
                key={type}
                variant="secondary"
                className={cn('text-xs gap-1', config.bgClass)}
              >
                <config.icon className="w-3 h-3" />
                {typeCounts[type]}
              </Badge>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFeed}
            className="h-7 gap-1.5 text-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', lastRefresh && 'animate-none')} />
            Actualiser
          </Button>
        </div>
      </div>

      {lastRefresh && (
        <p className="text-xs text-muted-foreground/60">
          Dernière actualisation : {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          <span className="mx-1">·</span>
          Actualisation automatique toutes les 30 secondes
        </p>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aucune activité récente</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Les activités de votre équipe apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([groupLabel, groupItems]) => (
            <div key={groupLabel}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {groupLabel}
              </h3>
              <div className="space-y-2">
                {groupItems.map((item) => {
                  const config = TYPE_CONFIG[item.type];
                  const IconComponent = config.icon;

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        'border-l-4 transition-all hover:shadow-sm',
                        config.borderClass
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Type icon */}
                          <div className={cn('shrink-0 mt-0.5 p-2 rounded-lg', config.bgClass)}>
                            <IconComponent className="w-4 h-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="secondary"
                                className={cn('text-[10px] h-5 px-1.5', config.bgClass)}
                              >
                                {config.label}
                              </Badge>
                              {item.userName && (
                                <span className="text-xs text-muted-foreground">
                                  par {item.userName}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 ml-auto">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-start gap-2">
                              {getActivityIcon(item.type, item.metadata)}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-tight truncate">
                                  {item.title}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
