'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Crown,
  FileText,
  Sparkles,
  Users,
  Calendar,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface UsageData {
  plan: {
    id: string;
    name: string;
    label: string;
    features: string[];
  } | null;
  postsUsed: number;
  postsLimit: number; // -1 = unlimited
  aiGenerationsUsed: number;
  aiGenerationsLimit: number; // -1 = unlimited
  teamMembersUsed: number;
  teamMembersLimit: number; // -1 = unlimited
  postsPercentage: number;
  aiPercentage: number;
  teamPercentage: number;
  periodEnd: string;
  periodStart: string;
  status: string;
  isNearLimit: boolean;
  isAtLimit: boolean;
  isFreePlan: boolean;
}

// ============================================================
// ProgressBar Component
// ============================================================

function UsageBar({
  label,
  icon,
  used,
  limit,
  percentage,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  used: number;
  limit: number; // -1 = unlimited
  percentage: number;
  color: string;
}) {
  const isUnlimited = limit === -1;
  const isHigh = percentage >= 80;
  const isFull = percentage >= 100;
  const barColor = isFull ? 'bg-red-500' : isHigh ? 'bg-amber-500' : color;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <div className={cn('w-4 h-4 flex items-center justify-center', isHigh ? 'text-amber-500' : 'text-muted-foreground')}>
            {icon}
          </div>
          <span className="font-medium">{label}</span>
        </div>
        <span className={cn(
          'text-xs font-semibold',
          isFull && 'text-red-600 dark:text-red-400',
          isHigh && !isFull && 'text-amber-600 dark:text-amber-400',
          !isHigh && 'text-muted-foreground',
        )}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            barColor,
            isHigh && 'animate-pulse',
          )}
          style={{ width: isUnlimited ? '15%' : `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Main UsageDashboard Component
// ============================================================

export default function UsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const setView = useAppStore((s) => s.setView);

  const fetchUsage = useCallback(async () => {
    try {
      const data = await apiFetch<{ usage: UsageData }>('/api/billing/usage');
      setUsage(data.usage);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!usage || !usage.plan) {
    return null;
  }

  const planLabel = usage.plan.label;
  const isFreePlan = usage.isFreePlan;
  const periodEnd = usage.periodEnd
    ? new Date(usage.periodEnd).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const getPlanBadgeColor = () => {
    switch (usage.plan?.name) {
      case 'free':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      case 'pro':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
      case 'enterprise':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className={cn(
              'w-4 h-4',
              isFreePlan ? 'text-slate-400' : 'text-amber-500'
            )} />
            <span className="text-sm font-semibold">Abonnement</span>
          </div>
          <Badge variant="secondary" className={cn('text-xs', getPlanBadgeColor())}>
            {isFreePlan && <Sparkles className="w-3 h-3 mr-1" />}
            {planLabel}
          </Badge>
        </div>

        {/* Usage Bars */}
        <div className="space-y-3">
          <UsageBar
            label="Publications"
            icon={<FileText className="w-3.5 h-3.5" />}
            used={usage.postsUsed}
            limit={usage.postsLimit}
            percentage={usage.postsPercentage}
            color="bg-emerald-500"
          />
          <UsageBar
            label="Générations IA"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            used={usage.aiGenerationsUsed}
            limit={usage.aiGenerationsLimit}
            percentage={usage.aiPercentage}
            color="bg-violet-500"
          />
          <UsageBar
            label="Membres d'équipe"
            icon={<Users className="w-3.5 h-3.5" />}
            used={usage.teamMembersUsed}
            limit={usage.teamMembersLimit}
            percentage={usage.teamPercentage}
            color="bg-blue-500"
          />
        </div>

        {/* Period Info */}
        {periodEnd && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {isFreePlan
                ? 'Plan gratuit actif'
                : `Votre période se termine le ${periodEnd}`}
            </span>
          </div>
        )}

        {/* Warning / Upgrade CTA */}
        {usage.isAtLimit && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400">
              Limites atteintes. Passez à un plan supérieur pour continuer.
            </p>
          </div>
        )}

        {usage.isNearLimit && !usage.isAtLimit && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Vous approchez de vos limites mensuelles.
            </p>
          </div>
        )}

        {!usage.isNearLimit && !usage.isAtLimit && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Votre utilisation est dans les limites de votre plan.
            </p>
          </div>
        )}

        {/* Upgrade CTA */}
        {isFreePlan && (
          <Button
            onClick={() => setView('pricing')}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
            size="sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            Passez au Pro
          </Button>
        )}

        {!isFreePlan && (usage.isNearLimit || usage.isAtLimit) && (
          <Button
            onClick={() => setView('pricing')}
            variant="outline"
            className="w-full gap-2 text-sm"
            size="sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            Changer de plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
