import { db } from '@/lib/db';
import { cookies } from 'next/headers';

const WORKSPACE_COOKIE = 'lp_workspace_id';

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceMemberRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  member: 'Membre',
  viewer: 'Lecteur',
};

/**
 * Get the current workspace ID from cookie
 */
export function getCurrentWorkspaceId(): string | null {
  // This must be called from a server-side context (Route Handler or Server Component)
  try {
    const cookieStore = cookies();
    return cookieStore.get(WORKSPACE_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Get the current workspace from cookie (server-side)
 */
export async function getCurrentWorkspace(request?: Request) {
  const workspaceId = getCurrentWorkspaceId();
  if (!workspaceId) return null;

  return db.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, isActive: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
      _count: { select: { members: true, linkedinAccounts: true } },
    },
  });
}

/**
 * Check if a user is a member of a workspace, and optionally check role
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string,
  requiredRole?: WorkspaceMemberRole[]
) {
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });

  if (!membership) {
    return { authorized: false, error: 'Vous n\'êtes pas membre de cet espace de travail', status: 403 };
  }

  if (requiredRole && requiredRole.length > 0) {
    if (!requiredRole.includes(membership.role as WorkspaceMemberRole)) {
      return {
        authorized: false,
        error: 'Vous n\'avez pas les permissions nécessaires dans cet espace de travail',
        status: 403,
      };
    }
  }

  return { authorized: true, membership };
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string) {
  return db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true, linkedinAccounts: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Ensure slug is unique by appending a counter if needed
 */
export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await db.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
