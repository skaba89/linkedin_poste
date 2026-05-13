import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from '@/lib/auth_helpers';

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  return NextResponse.json({ message: "Hello, world!" });
}
