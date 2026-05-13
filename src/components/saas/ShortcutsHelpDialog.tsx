'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { SHORTCUTS, formatShortcutKeys } from '@/lib/keyboard-shortcuts';
import type { ShortcutConfig } from '@/lib/keyboard-shortcuts';

/* ============================================================
   Category icon & colour
   ============================================================ */

const CATEGORY_META: Record<
  string,
  { label: string; color: string }
> = {
  Navigation: {
    label: 'Navigation',
    color: 'text-blue-500',
  },
  Actions: {
    label: 'Actions',
    color: 'text-violet-500',
  },
  Général: {
    label: 'Général',
    color: 'text-amber-500',
  },
};

/* ============================================================
   KeyBadge – renders a single <kbd> element
   ============================================================ */

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border border-border/70 bg-muted/80 text-[11px] font-mono font-medium text-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.05)]">
      {children}
    </kbd>
  );
}

/* ============================================================
   ShortcutRow – one shortcut line: keys + description
   ============================================================ */

function ShortcutRow({ shortcut }: { shortcut: ShortcutConfig }) {
  const keys = useMemo(() => formatShortcutKeys(shortcut), [shortcut]);

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-0.5">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && (
              <span className="text-[10px] text-muted-foreground/50 mx-0.5">+</span>
            )}
            <KeyBadge>{k}</KeyBadge>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ShortcutsHelpDialog
   ============================================================ */

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: ShortcutsHelpDialogProps) {
  const grouped = useMemo(() => {
    const order = ['Navigation', 'Actions', 'Général'];
    return order.map((cat) => ({
      category: cat,
      meta: CATEGORY_META[cat],
      shortcuts: SHORTCUTS.filter((s) => s.category === cat),
    }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-muted-foreground" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Utilisez ces raccourcis pour naviguer rapidement dans
            l&apos;application.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {grouped.map(({ category, meta, shortcuts }) => (
            <div key={category}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${meta.color} mb-2 px-2`}>
                {meta.label}
              </p>
              <div className="space-y-0.5">
                {shortcuts.map((s) => (
                  <ShortcutRow key={buildRowKey(s)} shortcut={s} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
          Les raccourcis sont désactivés lors de la saisie dans un champ texte.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Stable key for React list rendering */
function buildRowKey(s: ShortcutConfig): string {
  return [
    s.meta && 'meta',
    s.shift && 'shift',
    s.alt && 'alt',
    s.key,
  ]
    .filter(Boolean)
    .join('+');
}
