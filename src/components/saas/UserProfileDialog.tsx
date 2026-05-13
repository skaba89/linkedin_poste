'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText,
  Send,
  TrendingUp,
  LogIn,
  Plus,
  Pencil,
  Trash2,
  Check,
  XCircle,
  Activity,
  Lock,
  Loader2,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AuditLog } from '@/types';
import { ROLE_LABELS } from '@/types';

/* ============================================================
   Types
   ============================================================ */

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserProfileData {
  user: UserProfile;
  postsCount: number;
  publishedCount: number;
  approvalRate: number | null;
  recentActivity: AuditLog[];
}

/* ============================================================
   Activity icon helper
   ============================================================ */

function getActivityIcon(action: string): { icon: React.ReactNode; color: string } {
  switch (true) {
    case action.includes('login'):
      return { icon: <LogIn className="w-3.5 h-3.5" />, color: 'text-emerald-500 bg-emerald-500/10' };
    case action.includes('create'):
      return { icon: <Plus className="w-3.5 h-3.5" />, color: 'text-blue-500 bg-blue-500/10' };
    case action.includes('update'):
      return { icon: <Pencil className="w-3.5 h-3.5" />, color: 'text-amber-500 bg-amber-500/10' };
    case action.includes('delete'):
      return { icon: <Trash2 className="w-3.5 h-3.5" />, color: 'text-red-500 bg-red-500/10' };
    case action.includes('publish') || action.includes('posted'):
      return { icon: <Send className="w-3.5 h-3.5" />, color: 'text-indigo-500 bg-indigo-500/10' };
    case action.includes('approve') || action.includes('approved'):
      return { icon: <Check className="w-3.5 h-3.5" />, color: 'text-emerald-500 bg-emerald-500/10' };
    case action.includes('reject') || action.includes('rejected'):
      return { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-rose-500 bg-rose-500/10' };
    default:
      return { icon: <Activity className="w-3.5 h-3.5" />, color: 'text-slate-500 bg-slate-500/10' };
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatAction(action: string): string {
  const actions: Record<string, string> = {
    create: 'a créé un post',
    generate_ai: 'a généré des variantes IA',
    publish: 'a publié un post',
    approve: 'a approuvé un post',
    reject: 'a rejeté un post',
    login: "s'est connecté",
    update: 'a modifié un post',
    delete: 'a supprimé un post',
  };
  return actions[action] || action;
}

/* ============================================================
   UserProfileDialog
   ============================================================ */

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await apiFetch<UserProfileData>('/api/users/me');
      setProfileData(data);
    } catch {
      toast.error("Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordForm(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success('Mot de passe mis à jour avec succès');
      resetPasswordForm();
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const memberSince = profileData?.user.createdAt
    ? format(new Date(profileData.user.createdAt), 'd MMMM yyyy', { locale: fr })
    : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-hidden p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Mon profil</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Informations de votre compte et activité récente
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-52" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-40 w-full" />
              </div>
            ) : profileData ? (
              <>
                {/* Header section */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground font-semibold">
                      {getInitials(profileData.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold truncate">{profileData.user.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{profileData.user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABELS[profileData.user.role as keyof typeof ROLE_LABELS] || profileData.user.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        Membre depuis {memberSince}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Stats section */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/50 p-3 text-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 mx-auto mb-2">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-lg font-bold">{profileData.postsCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Posts créés
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-3 text-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 mx-auto mb-2">
                      <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-lg font-bold">{profileData.publishedCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Posts publiés
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-3 text-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 mx-auto mb-2">
                      <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <p className="text-lg font-bold">
                      {profileData.approvalRate !== null ? `${profileData.approvalRate}%` : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Taux d&apos;approbation
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Recent activity */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      Activité récente
                    </h4>
                    {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'validator') && (
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          setView('audit-logs');
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                      >
                        Voir tout
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {profileData.recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune activité récente
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                      {profileData.recentActivity.map((log) => {
                        const { icon, color } = getActivityIcon(log.action);
                        return (
                          <div key={log.id} className="flex items-start gap-2.5">
                            <div
                              className={cn(
                                'flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5',
                                color
                              )}
                            >
                              {icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs">
                                <span className="font-medium">{log.user?.name || 'Système'}</span>
                                <span className="text-muted-foreground ml-1">
                                  {formatAction(log.action)}
                                </span>
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                {formatDistanceToNow(new Date(log.createdAt), {
                                  addSuffix: true,
                                  locale: fr,
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Profile section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Informations du compte</h4>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nom d&apos;affichage</Label>
                      <Input value={profileData.user.name} readOnly className="h-9 text-sm bg-muted/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Adresse e-mail</Label>
                      <Input value={profileData.user.email} readOnly className="h-9 text-sm bg-muted/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Rôle</Label>
                      <Input
                        value={ROLE_LABELS[profileData.user.role as keyof typeof ROLE_LABELS] || profileData.user.role}
                        readOnly
                        className="h-9 text-sm bg-muted/50"
                      />
                    </div>
                  </div>

                  {/* Password change */}
                  {!showPasswordForm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setShowPasswordForm(true)}
                    >
                      <Lock className="w-4 h-4" />
                      Changer le mot de passe
                    </Button>
                  ) : (
                    <form onSubmit={handlePasswordSubmit} className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground">Nouveau mot de passe</p>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor="current-password" className="text-xs text-muted-foreground">
                            Mot de passe actuel
                          </Label>
                          <Input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="h-9 text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="new-password" className="text-xs text-muted-foreground">
                            Nouveau mot de passe
                          </Label>
                          <Input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="h-9 text-sm"
                            placeholder="Minimum 6 caractères"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">
                            Confirmer le nouveau mot de passe
                          </Label>
                          <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="submit" size="sm" disabled={savingPassword} className="gap-1.5">
                          {savingPassword ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Enregistrer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetPasswordForm}
                          disabled={savingPassword}
                        >
                          Annuler
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Impossible de charger les informations du profil
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
