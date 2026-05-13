import { db } from '@/lib/db';

// ============================================================
// Default permissions definition
// ============================================================
interface PermissionDef {
  name: string;
  description: string;
  category: string;
}

const DEFAULT_PERMISSIONS: PermissionDef[] = [
  // Posts
  { name: 'posts.view', description: 'Voir les publications', category: 'posts' },
  { name: 'posts.create', description: 'Créer des publications', category: 'posts' },
  { name: 'posts.edit', description: 'Modifier des publications', category: 'posts' },
  { name: 'posts.delete', description: 'Supprimer des publications', category: 'posts' },
  { name: 'posts.publish', description: 'Publier des publications', category: 'posts' },
  { name: 'posts.validate', description: 'Valider/rejeter des publications', category: 'posts' },
  { name: 'posts.score', description: 'Consulter les scores de contenu', category: 'posts' },
  { name: 'posts.export', description: 'Exporter des publications', category: 'posts' },

  // Analytics
  { name: 'analytics.view', description: 'Voir les statistiques', category: 'analytics' },
  { name: 'analytics.export', description: 'Exporter les statistiques', category: 'analytics' },

  // Users
  { name: 'users.view', description: 'Voir les utilisateurs', category: 'users' },
  { name: 'users.manage', description: 'Gérer les utilisateurs', category: 'users' },
  { name: 'users.invite', description: 'Inviter des utilisateurs', category: 'users' },

  // Agents
  { name: 'agents.view', description: 'Voir les agents IA', category: 'agents' },
  { name: 'agents.manage', description: 'Gérer les agents IA', category: 'agents' },
  { name: 'agents.configure', description: 'Configurer les agents IA', category: 'agents' },

  // Settings
  { name: 'settings.view', description: 'Voir les paramètres', category: 'settings' },
  { name: 'settings.manage', description: 'Gérer les paramètres', category: 'settings' },

  // Competitors
  { name: 'competitors.view', description: 'Voir les concurrents', category: 'competitors' },
  { name: 'competitors.manage', description: 'Gérer les concurrents', category: 'competitors' },

  // Prospects
  { name: 'prospects.view', description: 'Voir les prospects', category: 'prospects' },
  { name: 'prospects.manage', description: 'Gérer les prospects', category: 'prospects' },
  { name: 'prospects.export', description: 'Exporter les prospects', category: 'prospects' },

  // Brand Voice
  { name: 'brand_voice.view', description: 'Voir les profils de voix de marque', category: 'brand_voice' },
  { name: 'brand_voice.manage', description: 'Gérer les profils de voix de marque', category: 'brand_voice' },
];

// ============================================================
// Default roles definition
// ============================================================
interface RoleDef {
  name: string;
  label: string;
  description: string;
  isDefault: boolean;
  permissions: string[];
}

const DEFAULT_ROLES: RoleDef[] = [
  {
    name: 'admin',
    label: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités',
    isDefault: false,
    permissions: DEFAULT_PERMISSIONS.map((p) => p.name), // ALL
  },
  {
    name: 'editor',
    label: 'Éditeur',
    description: 'Peut créer, modifier et publier des publications',
    isDefault: true,
    permissions: [
      'posts.view', 'posts.create', 'posts.edit', 'posts.delete', 'posts.publish', 'posts.score', 'posts.export',
      'analytics.view', 'analytics.export',
      'prospects.view', 'prospects.manage', 'prospects.export',
      'brand_voice.view', 'brand_voice.manage',
      'competitors.view', 'competitors.manage',
    ],
  },
  {
    name: 'validator',
    label: 'Validateur',
    description: 'Peut valider les publications et voir les statistiques',
    isDefault: false,
    permissions: [
      'posts.view', 'posts.validate',
      'analytics.view',
    ],
  },
  {
    name: 'viewer',
    label: 'Lecteur',
    description: 'Consultation en lecture seule',
    isDefault: false,
    permissions: [
      'posts.view',
      'analytics.view',
    ],
  },
];

/**
 * Seeds the database with default roles and permissions.
 * Idempotent: won't duplicate existing entries.
 */
export async function seedRolesAndPermissions(): Promise<{
  rolesCreated: number;
  permissionsCreated: number;
  rolePermissionsLinked: number;
}> {
  let permissionsCreated = 0;
  let rolesCreated = 0;
  let rolePermissionsLinked = 0;

  // 1. Seed permissions
  for (const permDef of DEFAULT_PERMISSIONS) {
    const existing = await db.permission.findUnique({ where: { name: permDef.name } });
    if (!existing) {
      await db.permission.create({
        data: {
          name: permDef.name,
          description: permDef.description,
          category: permDef.category,
        },
      });
      permissionsCreated++;
    }
  }

  // 2. Seed roles
  for (const roleDef of DEFAULT_ROLES) {
    const existing = await db.role.findUnique({
      where: { name: roleDef.name },
      include: { rolePermissions: true },
    });

    if (!existing) {
      // Find all permission IDs for this role
      const perms = await db.permission.findMany({
        where: { name: { in: roleDef.permissions } },
        select: { id: true },
      });

      const role = await db.role.create({
        data: {
          name: roleDef.name,
          label: roleDef.label,
          description: roleDef.description,
          isDefault: roleDef.isDefault,
          rolePermissions: {
            create: perms.map((p) => ({ permissionId: p.id })),
          },
        },
      });

      // Link existing users whose `role` string matches
      await db.user.updateMany({
        where: { role: roleDef.name, roleId: null },
        data: { roleId: role.id },
      });

      rolesCreated++;
      rolePermissionsLinked += perms.length;
    } else {
      // Update permissions for existing roles
      const currentPermIds = new Set(existing.rolePermissions.map((rp) => rp.permissionId));
      const perms = await db.permission.findMany({
        where: { name: { in: roleDef.permissions } },
        select: { id: true },
      });

      for (const perm of perms) {
        if (!currentPermIds.has(perm.id)) {
          await db.rolePermission.create({
            data: { roleId: existing.id, permissionId: perm.id },
          });
          rolePermissionsLinked++;
        }
      }

      // Link existing users whose `role` string matches
      await db.user.updateMany({
        where: { role: roleDef.name, roleId: null },
        data: { roleId: existing.id },
      });
    }
  }

  return { rolesCreated, permissionsCreated, rolePermissionsLinked };
}
