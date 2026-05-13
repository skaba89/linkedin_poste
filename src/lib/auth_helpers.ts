import { db } from '@/lib/db';

export async function getAuthUser(request: Request): Promise<{ id: string; email: string; name: string; role: string; isActive: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const token = authHeader.slice(7);
  const { verifyToken } = await import('@/lib/auth');
  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  return user;
}

export function hasRole(user: { role: string }, ...roles: string[]): boolean {
  const userRole = user.role.toLowerCase();
  return roles.map(r => r.toLowerCase()).includes(userRole);
}
