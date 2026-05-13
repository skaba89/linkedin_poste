'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Linkedin,
  Trash2,
  Plus,
  Shield,
  Database,
  Users,
  Unplug,
  XCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { User, UserRole, LinkedInAccount } from '@/types';
import { ROLE_LABELS } from '@/types';

export default function SettingsView() {
  const user = useAppStore((s) => s.user);
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-lg font-bold">Paramètres</h2>

      {/* LinkedIn Configuration */}
      <LinkedInSection isAdmin={isAdmin} />

      {/* User Management (Admin only) */}
      {isAdmin && <UserManagementSection />}

      {/* Seed Data (Admin only) */}
      {isAdmin && <SeedDataSection />}
    </div>
  );
}

/* ============================================================
   LinkedIn Section
   ============================================================ */
function LinkedInSection({ isAdmin }: { isAdmin: boolean }) {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<{ accounts: LinkedInAccount[] }>('/api/linkedin');
      setAccounts(data.accounts);
    } catch {
      // silent
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !organizationId) {
      toast.error('Token d\'accès et ID organisation requis');
      return;
    }
    if (!/^\d+$/.test(organizationId.trim())) {
      toast.error('L\'ID organisation doit être un numéro (ex: 12345678), pas un nom. Trouvez-le dans l\'URL de votre page LinkedIn.');
      return;
    }
    setConnecting(true);
    try {
      await apiFetch('/api/linkedin', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          refreshToken: refreshToken.trim() || undefined,
          organizationId: organizationId.trim(),
          organizationName: organizationName.trim() || undefined,
        }),
      });
      toast.success('Compte LinkedIn connecté');
      setAccessToken('');
      setRefreshToken('');
      setOrganizationId('');
      setOrganizationName('');
      fetchAccounts();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectingId) return;
    try {
      await apiFetch(`/api/linkedin?accountId=${disconnectingId}`, {
        method: 'DELETE',
      });
      toast.success('Compte déconnecté');
      setDisconnectConfirmOpen(false);
      setDisconnectingId(null);
      fetchAccounts();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Linkedin className="w-4 h-4" />
          Configuration LinkedIn
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connectez votre compte LinkedIn pour publier des posts directement.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Connected Accounts */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Comptes connectés</Label>
          {loadingAccounts ? (
            <Skeleton className="h-16 w-full" />
          ) : accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3 border border-dashed border-border/50 rounded-lg text-center">
              Aucun compte LinkedIn connecté
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {account.organizationName || account.organizationId}
                      {account.tokenExpired === true && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <XCircle className="w-2.5 h-2.5" />
                          Token expiré
                        </Badge>
                      )}
                      {account.tokenExpired === false && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Actif
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Org ID: {account.organizationId} · Connecté le {formatDate(account.createdAt)}
                      {account.tokenExpiresAt && (
                        <span> · Expire le {formatDate(account.tokenExpiresAt)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {account.tokenExpired === true && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                          setAccessToken('');
                          setOrganizationId('');
                          setOrganizationName('');
                          // Scroll to connect form
                          document.getElementById('linkedin-connect-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        title="Mettre à jour le token"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => { setDisconnectingId(account.id); setDisconnectConfirmOpen(true); }}
                      >
                        <Unplug className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OAuth Connect Button */}
        {isAdmin && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                <Plus className="w-3.5 h-3.5 inline mr-1" />
                Ajouter un compte
              </Label>
              <a
                href="/api/linkedin/authorize"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0a66c2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#004182] hover:shadow-md active:scale-[0.98] w-full sm:w-auto"
              >
                <Linkedin className="w-4 h-4" />
                Connecter avec LinkedIn
              </a>
              <p className="text-xs text-muted-foreground">
                Connexion sécurisée via OAuth 2.0. Vous serez redirigé vers LinkedIn pour autoriser l'accès.
              </p>
            </div>

            {/* Manual Token Entry Fallback */}
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1 select-none py-1">
                <span className="transition-transform group-open:rotate-90">&#9654;</span>
                Ou saisir manuellement les tokens
              </summary>
              <form onSubmit={handleConnect} className="space-y-3 mt-3" id="linkedin-connect-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="accessToken" className="text-xs text-muted-foreground">
                    Access Token <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="AQV..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    required
                    disabled={connecting}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="refreshToken" className="text-xs text-muted-foreground">
                    Refresh Token
                  </Label>
                  <Input
                    id="refreshToken"
                    type="password"
                    placeholder="Optionnel"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    disabled={connecting}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orgId" className="text-xs text-muted-foreground">
                    ID Organisation (numérique uniquement) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="orgId"
                    type="text"
                    inputMode="numeric"
                    pattern="\d+"
                    placeholder="ex: 12345678"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={connecting}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orgName" className="text-xs text-muted-foreground">
                    Nom de l&apos;organisation
                  </Label>
                  <Input
                    id="orgName"
                    placeholder="Ma Société"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={connecting}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <Button type="submit" disabled={connecting} size="sm" className="gap-1.5">
                {connecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Connecter
              </Button>

              {/* Guide pour trouver l'Organization ID */}
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2 mt-2">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Comment trouver votre Organization ID :</p>
                <ol className="text-xs text-amber-600/80 dark:text-amber-400/80 space-y-1 list-decimal list-inside">
                  <li>Aller sur votre page LinkedIn entreprise</li>
                  <li>Regarder l&apos;URL : <span className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">linkedin.com/company/<strong>12345678</strong>/</span></li>
                  <li>Le numéro après <span className="font-mono">/company/</span> est votre Organization ID</li>
                </ol>
                <p className="text-[11px] text-amber-600/60 dark:text-amber-400/60">
                  L&apos;Organization ID est un nombre uniquement (ex: 12345678), pas le nom de votre entreprise.
                </p>
              </div>
              </form>
            </details>
          </>
        )}
      </CardContent>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={disconnectConfirmOpen} onOpenChange={setDisconnectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Déconnecter le compte LinkedIn ?</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sûr de vouloir déconnecter votre compte LinkedIn ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisconnectingId(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ============================================================
   User Management Section (Admin only)
   ============================================================ */
function UserManagementSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<{ id: string; isActive: boolean } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<{ users: User[] }>('/api/users');
      setUsers(data.users);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      await apiFetch('/api/users', {
        method: 'PUT',
        body: JSON.stringify({ userId, role: newRole }),
      });
      toast.success('Rôle mis à jour');
      fetchUsers();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = (userId: string, isActive: boolean) => {
    if (isActive) {
      // Disabling: require confirmation
      setUserToToggle({ id: userId, isActive });
      setDisableConfirmOpen(true);
    } else {
      // Enabling: proceed immediately
      performToggleActive(userId, isActive);
    }
  };

  const performToggleActive = async (userId: string, isActive: boolean) => {
    setUpdatingId(userId);
    try {
      await apiFetch('/api/users', {
        method: 'PUT',
        body: JSON.stringify({ userId, isActive: !isActive }),
      });
      toast.success(isActive ? 'Utilisateur désactivé' : 'Utilisateur activé');
      fetchUsers();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Gestion des utilisateurs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Modifiez les rôles et l&apos;état des utilisateurs.
        </p>
      </CardHeader>
      <CardContent>
        {/* Disable User Confirmation Dialog */}
        <AlertDialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Désactiver cet utilisateur ?</AlertDialogTitle>
              <AlertDialogDescription>
                Etes-vous sûr de vouloir désactiver cet utilisateur ? Il ne pourra plus se connecter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToToggle(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (userToToggle) { performToggleActive(userToToggle.id, userToToggle.isActive); setDisableConfirmOpen(false); setUserToToggle(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Désactiver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Utilisateur</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Rôle</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Statut</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleChangeRole(u.id, v as UserRole)}
                      disabled={updatingId === u.id}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={() => handleToggleActive(u.id, u.isActive)}
                        disabled={updatingId === u.id}
                      />
                      <span className="text-xs text-muted-foreground">
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="text-[10px]">
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
   Seed Data Section (Admin only)
   ============================================================ */
function SeedDataSection() {
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await apiFetch('/api/seed', {
        method: 'POST',
      });
      toast.success('Données de démonstration créées');
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error('Endpoint non disponible');
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-4 h-4" />
          Données de démonstration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Créez des données factices pour tester l&apos;application.
        </p>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={handleSeed}
          disabled={seeding}
          size="sm"
          className="gap-2"
        >
          {seeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          Générer les données de démo
        </Button>
      </CardContent>
    </Card>
  );
}
