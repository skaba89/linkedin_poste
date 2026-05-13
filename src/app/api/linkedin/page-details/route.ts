import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { linkedinHeaders } from '@/lib/linkedin-config';

interface LinkedInOrg {
  id?: string;
  localizedName?: string;
  description?: string;
  website?: { url?: string }[];
  industries?: { id?: string; localizedName?: string }[];
  logoV2?: {
    primary?: {
      image?: {
        elements?: {
          identifiers?: { identifier?: string; mediaType?: string }[];
        }[];
      };
    };
  };
  staffCount?: { range?: { start?: number; end?: number } };
  headline?: string;
  tagline?: string;
  specialties?: string[];
  coverPhotoV2?: {
    coverPhoto?: {
      image?: {
        elements?: {
          identifiers?: { identifier?: string; mediaType?: string }[];
        }[];
      };
    };
  };
}

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    if (!orgId) {
      return NextResponse.json({ error: 'ID organisation requis' }, { status: 400 });
    }

    // Find active LinkedIn account
    const account = await db.linkedInAccount.findFirst({
      where: { isActive: true, organizationId: orgId },
    });
    if (!account) {
      return NextResponse.json({ error: 'Aucun compte LinkedIn connecté pour cette organisation' }, { status: 404 });
    }

    // Fetch full organization details
    const response = await fetch(
      `https://api.linkedin.com/rest/organizations/${orgId}?field=localizedName,description,website,industries,logoV2,staffCount,headline,tagline,coverPhotoV2,specialties`,
      {
        headers: linkedinHeaders(account.accessToken),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      return NextResponse.json(
        { error: `Erreur LinkedIn (${response.status}): ${errBody.slice(0, 300)}` },
        { status: 400 }
      );
    }

    const org: LinkedInOrg = await response.json();

    return NextResponse.json({
      id: org.id,
      name: org.localizedName || '',
      description: org.description || '',
      headline: org.headline || '',
      tagline: org.tagline || '',
      website: org.website?.[0]?.url || '',
      industries: (org.industries || []).map((i) => i.localizedName || '').filter(Boolean),
      staffCountRange: org.staffCount?.range || null,
      specialties: org.specialties || [],
      logo: org.logoV2?.primary?.image?.elements?.[0]?.identifiers?.[0]?.identifier || '',
      coverPhoto: org.coverPhotoV2?.coverPhoto?.image?.elements?.[0]?.identifiers?.[0]?.identifier || '',
    });
  } catch (error) {
    console.error('LinkedIn page-details error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
