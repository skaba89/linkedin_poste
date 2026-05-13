'use client';

import { usePWAInstall } from './PWARegister';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  CheckCircle2,
  WifiOff,
  Bell,
  Zap,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PWAInstallSection() {
  const { canInstall, isInstalled, install } = usePWAInstall();

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      toast.success('Installation en cours...');
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Installer l&apos;application
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Accédez à DataSphere comme une application native sur votre appareil.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          {isInstalled ? (
            <Badge
              variant="secondary"
              className="gap-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-3 h-3" />
              Déjà installée
            </Badge>
          ) : canInstall ? (
            <Button onClick={handleInstall} size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Installer l&apos;application
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              {typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
                ? 'L&apos;application est déjà installée.'
                : 'L\'installation n\'est pas encore disponible sur cet appareil. Essayez depuis Chrome ou Edge sur mobile.'}
            </p>
          )}
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FeatureItem
            icon={<WifiOff className="w-4 h-4 text-muted-foreground" />}
            title="Hors-ligne"
            description="Accédez à vos posts même sans connexion internet"
          />
          <FeatureItem
            icon={<Bell className="w-4 h-4 text-muted-foreground" />}
            title="Notifications"
            description="Recevez des alertes push pour vos publications"
          />
          <FeatureItem
            icon={<Zap className="w-4 h-4 text-muted-foreground" />}
            title="Accès rapide"
            description="Ouvrez l&apos;app en un tap depuis l&apos;écran d&apos;accueil"
          />
        </div>

        {/* Install instructions for manual install */}
        {!isInstalled && !canInstall && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Comment installer manuellement :
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">iOS (Safari) :</strong> Appuyez sur le bouton Partager, puis « Ajouter à l&apos;écran d&apos;accueil »
              </p>
              <p>
                <strong className="text-foreground">Android (Chrome) :</strong> Appuyez sur le menu ⋮, puis « Installer l&apos;application »
              </p>
              <p>
                <strong className="text-foreground">Desktop (Chrome/Edge) :</strong> Cliquez sur l&apos;icône d&apos;installation dans la barre d&apos;adresse
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}
