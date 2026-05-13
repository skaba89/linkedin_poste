'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Shared state for PWA installability
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners: Set<() => void> = [];

function setDeferredPromptGlobal(prompt: BeforeInstallPromptEvent | null) {
  deferredPrompt = prompt;
  listeners.forEach((fn) => fn());
}

function subscribeToPrompt(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

function getCanInstallSnapshot() {
  return !!deferredPrompt;
}

function getServerSnapshot() {
  return false;
}

function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// Singleton installed state to avoid effect-based setState
let _isInstalled = false;
const installedListeners: Set<() => void> = new Set();

function setInstalledGlobal(value: boolean) {
  _isInstalled = value;
  installedListeners.forEach((fn) => fn());
}

export function usePWAInstall() {
  // Use useSyncExternalStore to avoid setState-in-effect issues
  const canInstall = useSyncExternalStore(
    subscribeToPrompt,
    getCanInstallSnapshot,
    getServerSnapshot,
  );

  const isInstalled = useSyncExternalStore(
    (callback) => {
      installedListeners.add(callback);
      return () => { installedListeners.delete(callback); };
    },
    () => _isInstalled,
    getServerSnapshot,
  );

  useEffect(() => {
    // Initialize installed state via external store (not setState)
    setInstalledGlobal(checkIsInstalled());

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPromptGlobal(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed
    const installedHandler = () => {
      setDeferredPromptGlobal(null);
      setInstalledGlobal(true);
      toast.success('Application installée avec succès !');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPromptGlobal(null);
      return true;
    }
    return false;
  }, []);

  return { canInstall, isInstalled, install };
}

export default function PWARegister() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Every hour
        })
        .catch(() => {
          // Service worker registration failed silently — non-critical
        });
    }
  }, []);

  // This is a headless component — no UI
  return null;
}
