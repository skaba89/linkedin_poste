import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Configuration LinkedIn manquante (LINKEDIN_CLIENT_ID)' },
        { status: 500 }
      );
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${origin}/api/linkedin/callback`;

    // Generate CSRF state (16 random hex chars)
    const state = crypto.randomBytes(8).toString('hex');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'r_liteprofile r_emailaddress w_member_social rw_organization_admin r_organization_social',
      state,
    });

    const authorizeUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

    // Set CSRF state cookie (15 min maxAge, httpOnly, sameSite)
    const response = NextResponse.redirect(authorizeUrl, 302);
    response.cookies.set('linkedin_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('LinkedIn authorize error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation de la connexion LinkedIn' },
      { status: 500 }
    );
  }
}
