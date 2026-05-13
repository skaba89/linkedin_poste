import { db } from '@/lib/db';

// ============================================================
// In-memory permission cache with TTL
// ============================================================
interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000; // 30 seconds
const permissionCache = new Map<string, CacheEntry>();

function getCacheKey(userId: string): string {
  return `user:${userId}:permissions`;
}

async function getUserPermissions(userId: string): Promise<Set<string>> {
  const cacheKey = getCacheKey(userId);
  const now = Date.now();

  // Check cache first
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.permissions;
  }

  // Fetch from database
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      roleId: true,
      assignedRole: {
        include: {
          permissions: {
            select: { name: true },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();

  if (user) {
    // Add permissions from assigned role (if any)
    if (user.assignedRole) {
      for (const perm of user.assignedRole.permissions) {
        permissions.add(perm.name);
      }
    }

    // Backward compatibility: if no role is assigned, fall back to legacy string-based role
    if (!user.roleId) {
      const legacyFallback: Record<string, string[]> = {
        admin: ['*'], // Admin gets all permissions
        editor: [
          'posts.view', 'posts.create', 'posts.edit', 'posts.delete', 'posts.publish', 'posts.score', 'posts.export',
          'analytics.view', 'analytics.export',
          'prospects.view', 'prospects.manage', 'prospects.export',
          'brand_voice.view', 'brand_voice.manage',
          'competitors.view', 'competitors.manage',
        ],
        validator: ['posts.view', 'posts.validate', 'analytics.view'],
      };

      const fallbackPerms = legacyFallback[user.role];
      if (fallbackPerms) {
        for (const p of fallbackPerms) {
          permissions.add(p);
        }
      }
    }

    // Admin always has wildcard
    if (permissions.has('*') || user.role === 'admin') {
      // Will be handled as "all permissions" in checks
      permissions.add('*');
    }
  }

  // Store in cache
  permissionCache.set(cacheKey, {
    permissions,
    expiresAt: now + CACHE_TTL_MS,
  });

  return permissions;
}

/**
 * Clear the permission cache for a specific user (e.g. after role change)
 */
export function clearPermissionCache(userId?: string): void {
  if (userId) {
    permissionCache.delete(getCacheKey(userId));
  } else {
    permissionCache.clear();
  }
}

/**
 * Check if a user has a specific permission.
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has('*') || permissions.has(permissionName);
}

/**
 * Check if a user has any of the listed permissions.
 */
export async function hasAnyPermission(userId: string, ...permissionNames: string[]): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  if (permissions.has('*')) return true;
  return permissionNames.some((name) => permissions.has(name));
}

/**
 * Check if a user has ALL of the listed permissions.
 */
export async function hasAllPermissions(userId: string, ...permissionNames: string[]): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  if (permissions.has('*')) return true;
  return permissionNames.every((name) => permissions.has(name));
}

/**
 * Get all permission names for a user.
 */
export async function getUserPermissionList(userId: string): Promise<string[]> {
  const permissions = await getUserPermissions(userId);
  if (permissions.has('*')) {
    // Admin: return all known permissions
    const allPerms = await db.permission.findMany({ select: { name: true } });
    return allPerms.map((p) => p.name);
  }
  return Array.from(permissions);
}

/**
 * Middleware helper that throws 403 if user lacks the required permission.
 * Returns null if authorized, or a NextResponse if not.
 */
export async function requirePermission(
  userId: string,
  permissionName: string
): Promise<{ authorized: true } | { authorized: false; status: number; error: string }> {
  const authorized = await hasPermission(userId, permissionName);
  if (authorized) {
    return { authorized: true };
  }
  return { authorized: false, status: 403, error: 'Permissions insuffisantes' };
}
