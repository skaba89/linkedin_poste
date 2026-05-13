'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch, ApiClientError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Key,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================
interface PermissionItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  label: string;
  description: string | null;
  isDefault: boolean;
  maxPostsPerMonth: number | null;
  features: string | null;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  permissionCount: number;
  permissions: PermissionItem[];
  permissionsByCategory: Record<string, { id: string; name: string; description: string | null }[]>;
}

interface PermissionByCategory {
  [category: string]: { id: string; name: string; description: string | null }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  posts: 'Publications',
  analytics: 'Statistiques',
  users: 'Utilisateurs',
  agents: 'Agents IA',
  settings: 'Paramètres',
  competitors: 'Concurrents',
  prospects: 'Prospects',
  brand_voice: 'Voix de marque',
};

const CATEGORY_COLORS: Record<string, string> = {
  posts: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  analytics: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  users: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  agents: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  settings: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  competitors: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400',
  prospects: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  brand_voice: 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400',
};

const PERM_LABELS: Record<string, string> = {
  'posts.view': 'Voir les publications',
  'posts.create': 'Créer des publications',
  'posts.edit': 'Modifier des publications',
  'posts.delete': 'Supprimer des publications',
  'posts.publish': 'Publier des publications',
  'posts.validate': 'Valider les publications',
  'posts.score': 'Consulter les scores',
  'posts.export': 'Exporter les publications',
  'analytics.view': 'Voir les statistiques',
  'analytics.export': 'Exporter les statistiques',
  'users.view': 'Voir les utilisateurs',
  'users.manage': 'Gérer les utilisateurs',
  'users.invite': 'Inviter des utilisateurs',
  'agents.view': 'Voir les agents IA',
  'agents.manage': 'Gérer les agents IA',
  'agents.configure': 'Configurer les agents IA',
  'settings.view': 'Voir les paramètres',
  'settings.manage': 'Gérer les paramètres',
  'competitors.view': 'Voir les concurrents',
  'competitors.manage': 'Gérer les concurrents',
  'prospects.view': 'Voir les prospects',
  'prospects.manage': 'Gérer les prospects',
  'prospects.export': 'Exporter les prospects',
  'brand_voice.view': 'Voir les voix de marque',
  'brand_voice.manage': 'Gérer les voix de marque',
};

function getPermLabel(name: string): string {
  return PERM_LABELS[name] || name;
}

// ============================================================
// Component
// ============================================================
export default function RoleManagement() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionByCategory>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editRole, setEditRole] = useState<RoleItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSelectedPermIds, setEditSelectedPermIds] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState<RoleItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [rolesData, permsData] = await Promise.all([
        apiFetch<{ roles: RoleItem[] }>('/api/roles'),
        apiFetch<{ byCategory: PermissionByCategory }>('/api/permissions'),
      ]);
      setRoles(rolesData.roles);
      setAllPermissions(permsData.byCategory);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Seed ---
  const handleSeed = async () => {
    setSeeding(true);
    try {
      await apiFetch('/api/roles', {
        method: 'PUT',
      });
      toast.success('Rôles et permissions initialisés');
      fetchData();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSeeding(false);
    }
  };

  // --- Open create dialog ---
  const openCreate = () => {
    setEditMode('create');
    setEditRole(null);
    setEditName('');
    setEditLabel('');
    setEditDescription('');
    setEditSelectedPermIds(new Set());
    setEditOpen(true);
  };

  // --- Open edit dialog ---
  const openEdit = (role: RoleItem) => {
    setEditMode('edit');
    setEditRole(role);
    setEditName(role.name);
    setEditLabel(role.label);
    setEditDescription(role.description || '');
    setEditSelectedPermIds(new Set(role.permissions.map((p) => p.id)));
    setEditOpen(true);
  };

  // --- Toggle a permission checkbox ---
  const togglePermission = (permId: string) => {
    setEditSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  // --- Toggle all permissions in a category ---
  const toggleCategoryAll = (category: string) => {
    const categoryPerms = allPermissions[category] || [];
    const allSelected = categoryPerms.every((p) => editSelectedPermIds.has(p.id));

    setEditSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Remove all in this category
        for (const p of categoryPerms) next.delete(p.id);
      } else {
        // Add all in this category
        for (const p of categoryPerms) next.add(p.id);
      }
      return next;
    });
  };

  // --- Save (create or update) ---
  const handleSave = async () => {
    if (!editName.trim() || !editLabel.trim()) {
      toast.error('Nom et libellé du rôle sont requis');
      return;
    }
    setSaving(true);
    try {
      if (editMode === 'create') {
        await apiFetch('/api/roles', {
          method: 'POST',
          body: JSON.stringify({
            name: editName.trim(),
            label: editLabel.trim(),
            description: editDescription.trim() || null,
            permissionIds: Array.from(editSelectedPermIds),
          }),
        });
        toast.success('Rôle créé avec succès');
      } else if (editRole) {
        await apiFetch(`/api/roles/${editRole.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editName.trim(),
            label: editLabel.trim(),
            description: editDescription.trim() || null,
            permissionIds: Array.from(editSelectedPermIds),
          }),
        });
        toast.success('Rôle mis à jour');
      }
      setEditOpen(false);
      fetchData();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Delete ---
  const openDelete = (role: RoleItem) => {
    setDeleteRole(role);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteRole) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/roles/${deleteRole.id}`, { method: 'DELETE' });
      toast.success('Rôle supprimé');
      setDeleteOpen(false);
      setDeleteRole(null);
      fetchData();
    } catch (error) {
      if (error instanceof ApiClientError) toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Gestion des rôles et permissions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez les rôles et leurs permissions d&apos;accès.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
                className="gap-1.5"
              >
                {seeding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Initialiser
              </Button>
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Nouveau rôle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun rôle configuré.</p>
              <p className="text-xs mt-1">Cliquez sur &quot;Initialiser&quot; pour créer les rôles par défaut.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Rôle</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Utilisateurs</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Permissions</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{r.label}</p>
                            {r.isDefault && (
                              <Badge variant="secondary" className="text-[10px]">Par défaut</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{r.name}</p>
                          {r.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{r.userCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          <Key className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(r.permissionsByCategory).map(([cat, perms]) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className="text-[10px]"
                                style={undefined}
                              >
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${CATEGORY_COLORS[cat]?.split(' ')[0]?.replace('bg-', 'background-') || ''}`} />
                                {CATEGORY_LABELS[cat] || cat} ({perms.length})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(r)}
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {r.name !== 'admin' && !r.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => openDelete(r)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* Create/Edit Dialog                                           */}
      {/* ============================================================ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editMode === 'create' ? 'Nouveau rôle' : `Modifier le rôle : ${editRole?.label}`}
            </DialogTitle>
            <DialogDescription>
              {editMode === 'create'
                ? 'Définissez le nom et les permissions du nouveau rôle.'
                : 'Modifiez les propriétés et les permissions du rôle.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role-name" className="text-xs">
                  Nom technique <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="role-name"
                  placeholder="ex: custom_editor"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editMode === 'edit' && editRole?.name === 'admin'}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-label" className="text-xs">
                  Libellé affiché <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="role-label"
                  placeholder="ex: Éditeur personnalisé"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc" className="text-xs">
                Description
              </Label>
              <Input
                id="role-desc"
                placeholder="Description optionnelle du rôle"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            <Separator />

            {/* Permissions by Category */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider">
                  Permissions ({editSelectedPermIds.size})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    if (editSelectedPermIds.size === Object.values(allPermissions).flat().length) {
                      setEditSelectedPermIds(new Set());
                    } else {
                      setEditSelectedPermIds(new Set(Object.values(allPermissions).flat().map((p) => p.id)));
                    }
                  }}
                >
                  {editSelectedPermIds.size === Object.values(allPermissions).flat().length
                    ? 'Tout décocher'
                    : 'Tout cocher'}
                </Button>
              </div>

              {Object.entries(allPermissions).map(([category, perms]) => {
                const allCatSelected = perms.every((p) => editSelectedPermIds.has(p.id));
                const someCatSelected = perms.some((p) => editSelectedPermIds.has(p.id));

                return (
                  <div key={category} className="rounded-lg border border-border/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${category}`}
                          checked={allCatSelected}
                          ref={(el) => {
                            if (el) {
                              (el as unknown as { dataset: Record<string, string> }).dataset.state = someCatSelected && !allCatSelected ? 'indeterminate' : '';
                            }
                          }}
                          onCheckedChange={() => toggleCategoryAll(category)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`cat-${category}`} className="text-sm font-medium cursor-pointer">
                          {CATEGORY_LABELS[category] || category}
                        </Label>
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {perms.filter((p) => editSelectedPermIds.has(p.id)).length}/{perms.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={editSelectedPermIds.has(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                            className="h-3.5 w-3.5"
                          />
                          <Label
                            htmlFor={`perm-${perm.id}`}
                            className="text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {getPermLabel(perm.name)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !editName.trim() || !editLabel.trim()} className="gap-1.5">
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : editMode === 'create' ? (
                <Plus className="w-3.5 h-3.5" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
              {editMode === 'create' ? 'Créer le rôle' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Delete Confirmation Dialog                                    */}
      {/* ============================================================ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rôle &quot;{deleteRole?.label}&quot; ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les utilisateurs assignés à ce rôle seront réassignés sans rôle spécifique.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteRole(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
