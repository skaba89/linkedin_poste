'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { toast } from 'sonner';
import type { AppView } from '@/types';

/* ============================================================
   Types
   ============================================================ */

export interface ShortcutConfig {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: 'Navigation' | 'Actions' | 'Général';
  /** Navigate to this AppView */
  view?: AppView;
  /** Special built-in action */
  action?: 'command-palette' | 'shortcuts-help' | 'escape';
}

/* ============================================================
   Shortcut Definitions
   ============================================================ */

export const SHORTCUTS: ShortcutConfig[] = [
  // Navigation
  { key: 'd', meta: true, description: 'Tableau de bord', view: 'dashboard', category: 'Navigation' },
  { key: 'p', meta: true, description: 'Liste des posts', view: 'posts', category: 'Navigation' },
  { key: 'n', meta: true, description: 'Créer un post', view: 'create-post', category: 'Navigation' },
  { key: 'c', meta: true, description: 'Calendrier', view: 'calendar', category: 'Navigation' },
  { key: 'a', meta: true, description: 'Analytics', view: 'analytics', category: 'Navigation' },
  { key: 's', meta: true, shift: true, description: 'Paramètres', view: 'settings', category: 'Navigation' },
  { key: 'l', meta: true, description: "Logs d'audit", view: 'audit-logs', category: 'Navigation' },

  // Actions
  { key: 'k', meta: true, description: 'Palette de commandes', action: 'command-palette', category: 'Actions' },
  { key: '/', meta: true, description: 'Recherche rapide', action: 'command-palette', category: 'Actions' },

  // Général
  { key: '?', description: 'Voir les raccourcis', action: 'shortcuts-help', category: 'Général' },
  { key: 'Escape', description: 'Retour', action: 'escape', category: 'Général' },
];

/* ============================================================
   Helpers
   ============================================================ */

const USED_KEY = 'lp_shortcuts_used';

function getUsedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(USED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function buildId(s: ShortcutConfig): string {
  return [
    s.meta && 'meta',
    s.ctrl && 'ctrl',
    s.shift && 'shift',
    s.alt && 'alt',
    s.key,
  ]
    .filter(Boolean)
    .join('+');
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  if (t.getAttribute('role') === 'textbox') return true;
  return false;
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);
}

/* ============================================================
   Display Helpers (for ShortcutsHelpDialog)
   ============================================================ */

export function formatShortcutKeys(s: ShortcutConfig): string[] {
  const mac = isMacPlatform();
  const parts: string[] = [];

  if (s.meta) parts.push(mac ? '⌘' : 'Ctrl');
  if (s.ctrl) parts.push('Ctrl');
  if (s.alt) parts.push(mac ? '⌥' : 'Alt');
  if (s.shift) parts.push(mac ? '⇧' : '⇧');

  if (s.key === 'Escape') {
    parts.push('Esc');
  } else if (s.key === '/' || s.key === '?') {
    parts.push(s.key);
  } else {
    parts.push(s.key.toUpperCase());
  }

  return parts;
}

/* ============================================================
   Hook
   ============================================================ */

export interface UseKeyboardShortcutsOptions {
  /** Called when ? is pressed to toggle the shortcuts dialog */
  onToggleShortcuts?: () => void;
  /** Current open state of the shortcuts dialog (prevents Escape conflict) */
  shortcutsOpen?: boolean;
}

export function useKeyboardShortcuts(opts?: UseKeyboardShortcutsOptions) {
  // Keep opts in a ref so the listener closure stays stable
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const usedRef = useRef<Set<string>>(getUsedSet());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip synthetic events dispatched by ourselves
      if ((e as unknown as Record<string, unknown>).__synthetic) return;

      // Skip when user is typing
      if (isTyping(e)) return;

      // Only active when authenticated
      const state = useAppStore.getState();
      if (!state.user) return;

      for (const s of SHORTCUTS) {
        // --- Key matching ---
        const isLetter = /^[a-zA-Z]$/.test(s.key);
        const keyMatch = isLetter
          ? e.key.toLowerCase() === s.key.toLowerCase()
          : e.key === s.key;

        if (!keyMatch) continue;

        // --- Modifier matching ---
        // For letter keys: meta/ctrl must match exactly; shift must match exactly
        // For special keys (?, Escape): only check meta/ctrl, ignore shift
        const metaOk = s.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);

        let shiftOk: boolean;
        if (isLetter) {
          shiftOk = s.shift ? e.shiftKey : !e.shiftKey;
        } else {
          // Special keys: don't enforce shift (e.g. ? requires shift on US keyboards)
          shiftOk = true;
        }

        const altOk = s.alt ? e.altKey : !e.altKey;

        if (!metaOk || !shiftOk || !altOk) continue;

        // --- Match found ---
        e.preventDefault();
        e.stopPropagation();

        // Toast on first use (skip Escape — too common)
        if (s.action !== 'escape') {
          const id = buildId(s);
          if (!usedRef.current.has(id)) {
            usedRef.current.add(id);
            try {
              localStorage.setItem(USED_KEY, JSON.stringify([...usedRef.current]));
            } catch {
              /* storage full */
            }
            toast(`Raccourci : ${s.description}`, { duration: 2000 });
          }
        }

        // --- Execute ---
        if (s.view) {
          state.setView(s.view);
        } else if (s.action === 'shortcuts-help') {
          optsRef.current?.onToggleShortcuts?.();
        } else if (s.action === 'command-palette') {
          // cmd+k is already handled by CommandPalette's own listener
          // For cmd+/ we dispatch a synthetic cmd+k event
          if (s.key === '/') {
            const synth = new KeyboardEvent('keydown', {
              key: 'k',
              metaKey: e.metaKey,
              ctrlKey: e.ctrlKey,
            });
            (synth as unknown as Record<string, unknown>).__synthetic = true;
            document.dispatchEvent(synth);
          }
          // key === 'k' → intentionally no-op here (CommandPalette handles it)
        } else if (s.action === 'escape') {
          // Only navigate to dashboard if no dialog is open
          if (!optsRef.current?.shortcutsOpen) {
            state.setView('dashboard');
          }
        }

        break; // first match wins
      }
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
