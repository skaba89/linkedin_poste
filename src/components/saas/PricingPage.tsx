'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Check,
  Sparkles,
  Zap,
  Building2,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  Loader2,
  X,
  Mail,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface PlanData {
  id: string;
  name: string;
  label: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  maxPostsPerMonth: number;
  maxAiGenerations: number;
  maxTeamMembers: number;
  features: string[];
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
  isCurrentPlan: boolean;
  subscriptionStatus: string | null;
}

interface SubscriptionData {
  id: string;
  plan: PlanData;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  postsUsedThisMonth: number;
  aiGenerationsUsed: number;
}

// ============================================================
// FAQ Data
// ============================================================

const faqItems = [
  {
    question: 'Puis-je changer de plan à tout moment ?',
    answer:
      'Oui, vous pouvez passer à un plan supérieur à tout moment. Le changement sera effectif immédiatement et les crédits seront ajustés au prorata. Pour rétrograder, contactez notre support.',
  },
  {
    question: 'Que se passe-t-il quand je atteins ma limite mensuelle ?',
    answer:
      'Vous recevrez une notification lorsque vous atteignez 80% de votre limite. Une fois la limite atteinte, vous pourrez toujours consulter vos publications mais la création de nouveaux posts sera temporairement suspendue jusqu\'au renouvellement.',
  },
  {
    question: 'Y a-t-il un essai gratuit du plan Pro ?',
    answer:
      'Oui ! Nous offrons 14 jours d\'essai gratuit sur le plan Pro. Vous pouvez tester toutes les fonctionnalités avancées sans engagement. Aucune carte bancaire n\'est requise pour démarrer l\'essai.',
  },
  {
    question: 'Comment fonctionne la facturation ?',
    answer:
      'La facturation est effectuée mensuellement ou annuellement selon votre choix. Le paiement annuel bénéficie d\'une réduction de 17%. Vous pouvez annuler à tout moment, votre accès reste actif jusqu\'à la fin de la période payée.',
  },
];

// ============================================================
// Plan Icon Helper
// ============================================================

function getPlanIcon(planName: string) {
  switch (planName) {
    case 'free':
      return <Sparkles className="w-5 h-5" />;
    case 'pro':
      return <Zap className="w-5 h-5" />;
    case 'enterprise':
      return <Building2 className="w-5 h-5" />;
    default:
      return <Crown className="w-5 h-5" />;
  }
}

function getPlanColor(planName: string) {
  switch (planName) {
    case 'free':
      return {
        border: 'border-slate-200 dark:border-slate-700',
        bg: 'bg-slate-50 dark:bg-slate-900/30',
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-600 dark:text-slate-400',
        buttonBg: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200',
      };
    case 'pro':
      return {
        border: 'border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20',
        bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      };
    case 'enterprise':
      return {
        border: 'border-amber-200 dark:border-amber-800',
        bg: 'bg-amber-50/50 dark:bg-amber-950/20',
        iconBg: 'bg-amber-100 dark:bg-amber-900/50',
        iconColor: 'text-amber-600 dark:text-amber-400',
        buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      };
    default:
      return {
        border: 'border-border',
        bg: '',
        iconBg: 'bg-muted',
        iconColor: 'text-muted-foreground',
        buttonBg: 'bg-primary text-primary-foreground hover:bg-primary/90',
      };
  }
}

function formatPrice(cents: number): string {
  if (cents === 0) return '0€';
  return `${(cents / 100).toFixed(0)}€`;
}

// ============================================================
// FAQ Accordion Item
// ============================================================

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{question}</span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 pl-12">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Change Plan Dialog
// ============================================================

function ChangePlanDialog({
  isOpen,
  onClose,
  currentPlan,
  targetPlan,
  yearly,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanData | null;
  targetPlan: PlanData;
  yearly: boolean;
}) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const price = yearly && targetPlan.priceYearly
    ? targetPlan.priceYearly
    : targetPlan.priceMonthly;
  const periodLabel = yearly ? '/an' : '/mois';

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Get current user
      const meData = await apiFetch<{ user: { id: string } }>('/api/auth/me');
      await apiFetch('/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({
          userId: meData.user.id,
          planName: targetPlan.name,
        }),
      });
      toast.success(`Plan changé vers ${targetPlan.label} avec succès !`);
      onClose();
      // Refresh the page data
      window.location.reload();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error('Erreur lors du changement de plan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-xl shadow-xl border border-border max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Changer de plan</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentPlan && targetPlan.name === currentPlan.name ? (
          <div className="text-center py-6">
            <Badge variant="secondary" className="text-sm mb-3">
              Plan actuel
            </Badge>
            <p className="text-muted-foreground">
              Vous êtes déjà sur le plan {targetPlan.label}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentPlan && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Plan actuel :</span>
                <Badge variant="outline">{currentPlan.label}</Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Badge className="bg-primary text-primary-foreground">{targetPlan.label}</Badge>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">
                {price === 0 ? 'Gratuit' : `${formatPrice(price)}${periodLabel}`}
              </p>
              {yearly && targetPlan.priceYearly && targetPlan.priceMonthly > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Soit {formatPrice(Math.round(targetPlan.priceYearly! / 12))}/mois
                  · Économisez {Math.round((1 - targetPlan.priceYearly! / (targetPlan.priceMonthly * 12)) * 100)}%
                </p>
              )}
            </div>

            {targetPlan.name === 'enterprise' ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Contactez notre équipe commerciale pour un plan sur mesure.
                </p>
                <a
                  href="mailto:contact@datasphere.io?subject=Demande plan Entreprise"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Nous contacter
                </a>
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className={cn('w-full gap-2', getPlanColor(targetPlan.name).buttonBg)}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {currentPlan ? 'Confirmer le changement' : 'Commencer'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main PricingPage Component
// ============================================================

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);
  const [dialogPlan, setDialogPlan] = useState<PlanData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await apiFetch<{ plans: PlanData[] }>('/api/billing/plan');
      setPlans(data.plans);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await apiFetch<{ subscription: SubscriptionData | null }>('/api/billing/subscription');
      setSubscription(data.subscription);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, [fetchPlans, fetchSubscription]);

  const currentPlan = subscription?.plan || null;

  const handlePlanClick = (plan: PlanData) => {
    if (plan.name === 'enterprise') {
      setDialogPlan(plan);
      setDialogOpen(true);
      return;
    }

    if (plan.isCurrentPlan) {
      toast.info('Vous êtes déjà sur ce plan.');
      return;
    }

    setDialogPlan(plan);
    setDialogOpen(true);
  };

  const getSavingsPercent = (monthly: number, yearly: number) => {
    if (!yearly || monthly === 0) return 0;
    return Math.round((1 - yearly / (monthly * 12)) * 100);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[500px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />
          <h2 className="text-2xl font-bold">Choisissez votre plan</h2>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Développez votre présence LinkedIn avec le plan adapté à vos ambitions.
          Commencez gratuitement et évoluez à votre rythme.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className={cn('text-sm font-medium', !yearly && 'text-foreground', yearly && 'text-muted-foreground')}>
            Mensuel
          </span>
          <Switch
            checked={yearly}
            onCheckedChange={setYearly}
            className="data-[state=checked]:bg-emerald-600"
          />
          <span className={cn('text-sm font-medium', yearly && 'text-foreground', !yearly && 'text-muted-foreground')}>
            Annuel
          </span>
          {yearly && plans.length > 1 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              Économisez jusqu&apos;à 17%
            </Badge>
          )}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {plans.map((plan) => {
          const colors = getPlanColor(plan.name);
          const price = yearly && plan.priceYearly
            ? plan.priceYearly
            : plan.priceMonthly;
          const monthlyEquiv = yearly && plan.priceYearly
            ? Math.round(plan.priceYearly / 12)
            : null;
          const savings = getSavingsPercent(plan.priceMonthly, plan.priceYearly ?? 0);
          const isCurrent = plan.isCurrentPlan;
          const isDowngrade = currentPlan && (
            (currentPlan.name === 'pro' && plan.name === 'free') ||
            (currentPlan.name === 'enterprise' && (plan.name === 'free' || plan.name === 'pro'))
          );

          let ctaLabel = 'Commencer';
          if (plan.name === 'enterprise') {
            ctaLabel = 'Contactez-nous';
          } else if (isCurrent) {
            ctaLabel = 'Plan actuel';
          } else if (isDowngrade) {
            ctaLabel = 'Rétrograder';
          } else if (currentPlan) {
            ctaLabel = `Passer au ${plan.label}`;
          }

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
                colors.border,
                colors.bg,
                plan.isPopular && 'md:-mt-3 md:mb-0 shadow-lg',
              )}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute top-0 left-0 right-0">
                  <div className="bg-emerald-600 text-white text-center py-1.5 text-xs font-semibold">
                    ⭐ Le plus populaire
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && !plan.isPopular && (
                <div className="absolute top-0 left-0 right-0">
                  <div className="bg-primary text-primary-foreground text-center py-1.5 text-xs font-semibold">
                    Plan actuel
                  </div>
                </div>
              )}

              <CardHeader className={cn('pb-4', plan.isPopular && 'pt-10')}>
                <div className="flex items-center gap-3">
                  <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl', colors.iconBg)}>
                    <div className={colors.iconColor}>
                      {getPlanIcon(plan.name)}
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className={cn('space-y-5', plan.isPopular ? 'pt-0' : 'pt-0')}>
                {/* Price */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      {price === 0 ? 'Gratuit' : formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {yearly ? '/an' : '/mois'}
                      </span>
                    )}
                  </div>
                  {monthlyEquiv && price > 0 && yearly && (
                    <p className="text-xs text-muted-foreground">
                      Soit {formatPrice(monthlyEquiv)}/mois
                      {savings > 0 && ` · Économisez ${savings}%`}
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2.5">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className={cn('w-4 h-4 shrink-0 mt-0.5', colors.iconColor)} />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handlePlanClick(plan)}
                  disabled={isCurrent}
                  className={cn(
                    'w-full gap-2 font-semibold',
                    isCurrent
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : colors.buttonBg,
                  )}
                >
                  {isCurrent ? (
                    <Check className="w-4 h-4" />
                  ) : plan.name === 'enterprise' ? (
                    <Mail className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {ctaLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-center">Questions fréquentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
          {faqItems.map((item, i) => (
            <FaqItem key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>

      {/* Change Plan Dialog */}
      {dialogPlan && (
        <ChangePlanDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          currentPlan={currentPlan}
          targetPlan={dialogPlan}
          yearly={yearly}
        />
      )}
    </div>
  );
}
