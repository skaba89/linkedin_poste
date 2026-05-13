'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Linkedin,
  Sparkles,
  LayoutDashboard,
  PenSquare,
  Check,
  X,
  PartyPopper,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

/* ============================================================
   Confetti particle data
   ============================================================ */
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}

function generateParticles(count: number): Particle[] {
  const colors = ['#818cf8', '#c084fc', '#f472b6', '#4ade80', '#fbbf24', '#60a5fa', '#fb923c'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 360,
  }));
}

/* ============================================================
   Step indicator
   ============================================================ */
function StepIndicator({ currentStep, totalSteps, onSkip }: { currentStep: number; totalSteps: number; onSkip: () => void }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2 mr-4">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex-1 flex items-center gap-2">
            <motion.div
              className="h-1.5 rounded-full bg-primary/20 flex-1 overflow-hidden"
              initial={false}
            >
              <motion.div
                className={cn(
                  'h-full rounded-full gradient-primary',
                  i < currentStep && 'w-full',
                  i === currentStep && 'w-full',
                  i > currentStep && 'w-0'
                )}
                animate={{
                  width: i <= currentStep ? '100%' : '0%',
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        ))}
      </div>

      {/* Step dots + skip */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <motion.div
              key={i}
              className={cn(
                'rounded-full transition-colors duration-300',
                i === currentStep
                  ? 'w-2.5 h-2.5 bg-primary shadow-sm shadow-primary/30'
                  : i < currentStep
                    ? 'w-2 h-2 bg-primary/60'
                    : 'w-2 h-2 bg-muted-foreground/20'
              )}
              layout
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3 mr-1" />
          Passer l&apos;introduction
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Glassmorphism card wrapper
   ============================================================ */
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl p-6 md:p-8 max-w-lg w-full mx-auto',
        'bg-background/80 dark:bg-card/80',
        'backdrop-blur-2xl',
        'border border-border/50 dark:border-border/30',
        'shadow-2xl shadow-black/10 dark:shadow-black/40',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   Step 1: Bienvenue
   ============================================================ */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-lg shadow-primary/25"
      >
        <Linkedin className="w-10 h-10 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          <span className="gradient-text">Bienvenue sur LinkedInPost</span>
        </h2>
        <p className="text-muted-foreground text-base md:text-lg max-w-sm mx-auto leading-relaxed">
          Votre outil de gestion de contenu LinkedIn.
          <br />
          <span className="flex items-center justify-center gap-1.5 mt-1">
            <Sparkles className="w-4 h-4 text-primary" />
            Gestion intelligente, publication simplifiee
          </span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Button
          onClick={onNext}
          size="lg"
          className="h-12 px-8 text-base font-semibold rounded-xl gap-2 shadow-lg shadow-primary/25"
        >
          Commencer
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}

/* ============================================================
   Step 2: Decouvrir le tableau de bord
   ============================================================ */
function StepDashboard({ onNext }: { onNext: () => void }) {
  const setView = useAppStore((s) => s.setView);

  const handleNext = () => {
    setView('dashboard');
    onNext();
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20"
      >
        <LayoutDashboard className="w-8 h-8 text-blue-500" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Decouvrez le tableau de bord
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto leading-relaxed">
          Voici votre tableau de bord. Vous y trouverez un apercu de tous vos posts,
          vos statistiques et des actions rapides.
        </p>
      </motion.div>

      {/* Mini dashboard preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full rounded-xl border border-border/50 dark:border-border/30 bg-muted/30 dark:bg-muted/10 p-4 space-y-3"
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Brouillons', value: '12', color: 'text-amber-500' },
            { label: 'En attente', value: '3', color: 'text-blue-500' },
            { label: 'Publies', value: '45', color: 'text-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-2 rounded-lg bg-background/50 dark:bg-card/50">
              <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {['Post sur le networking', 'Astuce productivite', 'Analyse tendance IA'].map((title, i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded-md bg-background/50 dark:bg-card/50">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="text-xs text-muted-foreground truncate">{title}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          onClick={handleNext}
          size="lg"
          className="h-11 px-6 text-sm font-semibold rounded-xl gap-2"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}

/* ============================================================
   Step 3: Creer votre premier post
   ============================================================ */
function StepCreatePost({ onNext }: { onNext: () => void }) {
  const setView = useAppStore((s) => s.setView);
  const selectPost = useAppStore((s) => s.selectPost);
  const [formStep, setFormStep] = useState<'subject' | 'generating' | 'variants'>('subject');
  const [subject, setSubject] = useState('');

  const handleGenerate = () => {
    if (!subject.trim()) return;
    setFormStep('generating');
    setTimeout(() => setFormStep('variants'), 1500);
  };

  const handleNext = () => {
    selectPost(null);
    setView('create-post');
    onNext();
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20"
      >
        <PenSquare className="w-8 h-8 text-violet-500" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Creez votre premier post
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto leading-relaxed">
          Creez votre premier post en remplissant le sujet et l&apos;angle.
          Notre IA generera 3 variantes pour vous.
        </p>
      </motion.div>

      {/* Demo form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full rounded-xl border border-border/50 dark:border-border/30 bg-muted/30 dark:bg-muted/10 p-4 space-y-3"
      >
        <AnimatePresence mode="wait">
          {formStep === 'subject' && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="text-left">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Sujet du post
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pourquoi l'IA va transformer le marketing"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border/50 bg-background/80 dark:bg-card/80 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="text-left">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Angle
                </label>
                <input
                  type="text"
                  placeholder="Ex: Perspective personnelle avec donnees"
                  className="w-full h-9 px-3 rounded-lg border border-border/50 bg-background/80 dark:bg-card/80 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!subject.trim()}
                size="sm"
                className="w-full h-9 text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generer avec l&apos;IA
              </Button>
            </motion.div>
          )}

          {formStep === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              <p className="text-sm text-muted-foreground">IA en cours de generation...</p>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full gradient-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.4, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          )}

          {formStep === 'variants' && (
            <motion.div
              key="variants"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <p className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                <Check className="w-3 h-3" />
                3 variantes generees
              </p>
              {['Variante A — Directe & percutante', 'Variante B — Storytelling', 'Variante C — Avec donnees'].map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.3 }}
                  className="p-2 rounded-lg bg-background/50 dark:bg-card/50 border border-border/30 flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-xs text-muted-foreground">{v}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          onClick={handleNext}
          size="lg"
          className="h-11 px-6 text-sm font-semibold rounded-xl gap-2"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}

/* ============================================================
   Step 4: Connecter LinkedIn
   ============================================================ */
function StepConnectLinkedIn({ onNext, linkedinSkipped, setLinkedinSkipped }: { onNext: () => void; linkedinSkipped: boolean; setLinkedinSkipped: (skipped: boolean) => void }) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    setConnecting(true);
    // Simulate LinkedIn connection flow
    setTimeout(() => {
      setConnecting(false);
      toast.success('Compte LinkedIn connecte avec succes !');
      onNext();
    }, 1500);
  };

  const handleSkip = () => {
    setLinkedinSkipped(true);
    onNext();
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-600/20"
      >
        <Linkedin className="w-8 h-8 text-[#0A66C2]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Connecter LinkedIn
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto leading-relaxed">
          Connectez votre compte LinkedIn pour publier directement depuis l&apos;application.
        </p>
      </motion.div>

      {/* LinkedIn connection preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full rounded-xl border border-border/50 dark:border-border/30 bg-muted/30 dark:bg-muted/10 p-4"
      >
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A66C2]/5 border border-[#0A66C2]/10">
          <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center shrink-0">
            <Linkedin className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium truncate">Publication directe</p>
            <p className="text-xs text-muted-foreground">Publiez en un clic depuis l&apos;editeur</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="text-center p-2 rounded-lg bg-background/50 dark:bg-card/50">
            <p className="text-xs text-muted-foreground">Planification</p>
            <p className="text-sm font-medium">Auto</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50 dark:bg-card/50">
            <p className="text-xs text-muted-foreground">Statistiques</p>
            <p className="text-sm font-medium">Temps reel</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs"
      >
        <Button
          onClick={handleConnect}
          disabled={connecting}
          size="lg"
          className="h-11 px-6 text-sm font-semibold rounded-xl gap-2 bg-[#0A66C2] hover:bg-[#004182] shrink-0"
        >
          {connecting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              Connexion...
            </>
          ) : (
            <>
              <Linkedin className="w-4 h-4" />
              Connecter LinkedIn
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={handleSkip}
          className="h-11 px-6 text-sm text-muted-foreground hover:text-foreground rounded-xl"
        >
          Je ferai ca plus tard
        </Button>
      </motion.div>
    </div>
  );
}

/* ============================================================
   Step 5: C'est parti ! (celebration)
   ============================================================ */
function StepDone({
  linkedinSkipped,
  onComplete,
}: {
  linkedinSkipped: boolean;
  onComplete: () => void;
}) {
  const particles = useMemo(() => generateParticles(40), []);

  const features = [
    { label: 'Tableau de bord', done: true },
    { label: 'Creation de posts', done: true },
    { label: 'Connexion LinkedIn', done: !linkedinSkipped },
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-6 relative">
      {/* Confetti particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute pointer-events-none"
          style={{ left: `${p.x}%` }}
          initial={{ y: '-10%', opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            y: '120%',
            opacity: [0, 1, 1, 0],
            rotate: p.rotation + 360,
            scale: [0, 1, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            }}
          />
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-lg shadow-primary/25 relative z-10"
      >
        <PartyPopper className="w-10 h-10 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="space-y-3 relative z-10"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          <span className="gradient-text">C&apos;est parti !</span>
        </h2>
        <p className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
          Vous etes pret ! Explorez toutes les fonctionnalites depuis le menu lateral.
        </p>
      </motion.div>

      {/* Feature checklist */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="w-full space-y-2 relative z-10"
      >
        {features.map((feature, i) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.15, duration: 0.3 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border',
              feature.done
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                feature.done
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-amber-500/15 text-amber-500'
              )}
            >
              {feature.done ? (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              ) : (
                <span className="text-[10px] font-bold">!</span>
              )}
            </div>
            <span className={cn(
              'text-sm font-medium',
              feature.done ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {feature.label}
            </span>
            {feature.done ? (
              <span className="ml-auto text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Termine
              </span>
            ) : (
              <span className="ml-auto text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                En attente
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        className="relative z-10"
      >
        <Button
          onClick={onComplete}
          size="lg"
          className="h-12 px-8 text-base font-semibold rounded-xl gap-2 shadow-lg shadow-primary/25"
        >
          Commencer a utiliser LinkedInPost
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}

/* ============================================================
   OnboardingFlow (main export)
   ============================================================ */
const TOTAL_STEPS = 5;

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [linkedinSkipped, setLinkedinSkipped] = useState(false);
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);
  const setView = useAppStore((s) => s.setView);

  const skipAll = useCallback(() => {
    setOnboardingCompleted(true);
    setView('dashboard');
    toast.success('Bienvenue ! N\'hesitez pas a consulter l\'aide si besoin.');
  }, [setOnboardingCompleted, setView]);

  const handleComplete = useCallback(() => {
    setOnboardingCompleted(true);
    setView('dashboard');
    toast.success('Bienvenue sur LinkedInPost !');
  }, [setOnboardingCompleted, setView]);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  // Animation variants for step transitions
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 80 : -80,
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    setDirection(1);
    goNext();
  };

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop overlay */}
      <motion.div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Step indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="w-full mb-4"
        >
          <StepIndicator
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            onSkip={skipAll}
          />
        </motion.div>

        {/* Step card with AnimatePresence */}
        <GlassCard>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              {currentStep === 0 && <StepWelcome onNext={handleNext} />}
              {currentStep === 1 && <StepDashboard onNext={handleNext} />}
              {currentStep === 2 && <StepCreatePost onNext={handleNext} />}
              {currentStep === 3 && (
                <StepConnectLinkedIn
                  onNext={handleNext}
                  linkedinSkipped={linkedinSkipped}
                  setLinkedinSkipped={setLinkedinSkipped}
                />
              )}
              {currentStep === 4 && (
                <StepDone
                  linkedinSkipped={linkedinSkipped}
                  onComplete={handleComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        {/* Step counter text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[11px] text-muted-foreground/60 mt-4"
        >
          Etape {currentStep + 1} sur {TOTAL_STEPS}
        </motion.p>
      </div>
    </motion.div>
  );
}
