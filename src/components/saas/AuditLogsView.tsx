'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollText, ChevronDown, Loader2, Shield } from 'lucide-react';
import EmptyState from './EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/types';

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const hasMore = useRef(true);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(currentOffset));

      const data = await apiFetch<{ logs: AuditLog[] }>(
        `/api/audit-logs?${params.toString()}`
      );

      if (reset) {
        setLogs(data.logs);
      } else {
        setLogs((prev) => [...prev, ...data.logs]);
      }

      hasMore.current = data.logs.length === limit;
      setOffset(currentOffset + data.logs.length);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, limit]);

  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore.current && !loadingMore && !loading) {
          fetchLogs(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [fetchLogs, loadingMore, loading]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      login: 'Connexion',
      create: 'Création',
      update: 'Modification',
      delete: 'Suppression',
      generate_ai: 'Génération IA',
      validate_approve: 'Approbation',
      validate_reject: 'Rejet',
      validate_request_changes: 'Demande modifications',
      publish_success: 'Publication réussie',
      publish_failed: 'Publication échouée',
      connect: 'Connexion LinkedIn',
      disconnect: 'Déconnexion LinkedIn',
    };
    return actionMap[action] || action;
  };

  const formatEntityType = (type: string) => {
    const typeMap: Record<string, string> = {
      User: 'Utilisateur',
      Post: 'Post',
      LinkedInAccount: 'Compte LinkedIn',
    };
    return typeMap[type] || type;
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('reject') || action.includes('failed')) {
      return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400';
    }
    if (action.includes('create') || action.includes('approve') || action.includes('publish_success') || action.includes('connect') || action === 'login') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
    }
    if (action.includes('update') || action.includes('generate') || action.includes('request_changes')) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const renderMetadata = (metadata?: string) => {
    if (!metadata) return null;
    try {
      const meta = JSON.parse(metadata);
      return (
        <pre className="text-[10px] text-muted-foreground bg-muted/30 rounded p-1.5 max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap font-mono">
          {JSON.stringify(meta, null, 0)}
        </pre>
      );
    } catch {
      return <span className="text-[10px] text-muted-foreground">{metadata}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ScrollText className="w-5 h-5" />
          Logs d&apos;audit
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs(true)}
          disabled={loading}
          className="gap-1.5"
        >
          <Loader2 className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
          Actualiser
        </Button>
      </div>

      <Card className="border-border/50 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-6 h-6" />}
            title="Aucun log d'audit"
            description="Les actions effectuées dans l'application apparaîtront ici"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Entité</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Action</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Utilisateur</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={`${log.id}-${index}`} className="group">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {formatEntityType(log.entityType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] font-medium',
                            getActionColor(log.action)
                          )}
                        >
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {log.user?.name || 'Système'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {renderMetadata(log.metadata)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Load more / Infinite scroll trigger */}
            <div ref={observerRef} className="py-4 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </div>
              )}
              {!hasMore.current && logs.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Fin des logs · {logs.length} entrées affichées
                </p>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
