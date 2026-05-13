'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Application Error:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight">
                Une erreur est survenue
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                L&apos;application a rencontré une erreur inattendue.
                Veuillez réessayer ou rafraîchir la page.
              </p>
              {error.message && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {error.message}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={reset}
                className="w-full gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Clear localStorage and reload
                  if (typeof window !== 'undefined') {
                    localStorage.clear();
                  }
                  window.location.href = '/';
                }}
                className="w-full"
              >
                Réinitialiser et recharger
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
