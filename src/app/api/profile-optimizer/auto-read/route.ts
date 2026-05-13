import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth_helpers';
import { linkedinHeaders } from '@/lib/linkedin-config';

// ============================================================
// Types
// ============================================================

interface LinkedInUserInfo {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  name?: string;
}

interface LinkedInLiteProfile {
  localizedFirstName?: string;
  localizedLastName?: string;
  headline?: {
    localized?: string;
  };
}

interface LinkedInPosition {
  id?: string;
  title?: string;
  companyName?: {
    localized?: string;
  };
  timePeriod?: {
    startDate?: { year?: number; month?: number };
    endDate?: { year?: number; month?: number } | null;
  };
  description?: {
    localized?: string;
  };
}

interface GatheredProfileData {
  name: string;
  email: string;
  picture: string;
  locale: string;
  personId: string;
  headline: string | null;
  about: string | null;
  positions: Array<{
    title: string;
    company: string;
    startDate: string;
    description: string | null;
  }>;
  rawUserInfo: LinkedInUserInfo;
  warnings: string[];
}

// ============================================================
// Helpers
// ============================================================

async function fetchUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.error('[AutoRead] /v2/userinfo failed:', response.status);
      return {};
    }
    return response.json();
  } catch (error) {
    console.error('[AutoRead] /v2/userinfo error:', error);
    return {};
  }
}

async function fetchLiteProfile(accessToken: string, personId: string): Promise<LinkedInLiteProfile | null> {
  try {
    const response = await fetch(
      `https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,headline)`,
      { headers: linkedinHeaders(accessToken) }
    );
    if (!response.ok) {
      console.error('[AutoRead] /rest/me failed:', response.status);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('[AutoRead] /rest/me error:', error);
    return null;
  }
}

async function fetchPositions(accessToken: string, personId: string): Promise<LinkedInPosition[]> {
  try {
    const response = await fetch(
      `https://api.linkedin.com/rest/positions?q=person&personId=${personId}&projection=(elements*(id,title,companyName,timePeriod,description))`,
      { headers: linkedinHeaders(accessToken) }
    );
    if (!response.ok) {
      console.error('[AutoRead] /rest/positions failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.elements || [];
  } catch (error) {
    console.error('[AutoRead] /rest/positions error:', error);
    return [];
  }
}

// ============================================================
// POST /api/profile-optimizer/auto-read
// ============================================================

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 1. Find active LinkedInAccount
    const linkedinAccount = await db.linkedInAccount.findFirst({
      where: { userId: authUser.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!linkedinAccount) {
      return NextResponse.json(
        { error: 'Veuillez connecter votre compte LinkedIn' },
        { status: 400 }
      );
    }

    // Check token expiry
    if (linkedinAccount.tokenExpiresAt && linkedinAccount.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Le jeton LinkedIn a expiré. Veuillez reconnecter votre compte LinkedIn.' },
        { status: 400 }
      );
    }

    const { accessToken, personId } = linkedinAccount;
    const warnings: string[] = [];

    // 2. Fetch profile data from LinkedIn API
    // a) GET /v2/userinfo — name, email, picture, locale
    const userInfo = await fetchUserInfo(accessToken);
    const name = userInfo.name || [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') || authUser.name;
    const email = userInfo.email || '';
    const picture = userInfo.picture || '';
    const locale = userInfo.locale || '';
    const effectivePersonId = personId || userInfo.sub || '';

    if (!userInfo.email) {
      warnings.push('Email non disponible (le scope "email" n\'est peut-être pas autorisé)');
    }

    // b) Attempt to fetch lite profile (headline)
    let headline: string | null = null;
    if (effectivePersonId) {
      const liteProfile = await fetchLiteProfile(accessToken, effectivePersonId);
      if (liteProfile?.headline?.localized) {
        headline = liteProfile.headline.localized;
      } else {
        warnings.push('Titre LinkedIn non disponible (le scope "r_liteprofile" est requis pour accéder au titre)');
      }
    } else {
      warnings.push('Identifiant LinkedIn manquant, impossible de récupérer le titre et les positions');
    }

    // c) Attempt to fetch positions (experience)
    let positions: LinkedInPosition[] = [];
    if (effectivePersonId) {
      positions = await fetchPositions(accessToken, effectivePersonId);
      if (positions.length === 0) {
        warnings.push('Aucune expérience récupérée (le scope "r_fullprofile" est requis pour accéder aux positions)');
      }
    }

    // d) Build structured profile data
    const profileData: GatheredProfileData = {
      name,
      email,
      picture,
      locale,
      personId: effectivePersonId,
      headline,
      about: null, // LinkedIn API doesn't expose 'about' through standard scopes easily
      positions: positions.map((p) => ({
        title: p.title || 'Sans titre',
        company: p.companyName?.localized || 'Entreprise non spécifiée',
        startDate: p.timePeriod?.startDate
          ? `${String(p.timePeriod.startDate.month || '01').padStart(2, '0')}/${p.timePeriod.startDate.year}`
          : 'Date inconnue',
        description: p.description?.localized || null,
      })),
      rawUserInfo: userInfo,
      warnings,
    };

    // Add a warning for missing about section
    if (!profileData.about) {
      warnings.push('La section "À propos" n\'est pas accessible via l\'API LinkedIn standard. Vous pouvez la coller manuellement pour une analyse complète.');
    }

    // 3. Update the LinkedInAccount with fetched person data
    await db.linkedInAccount.update({
      where: { id: linkedinAccount.id },
      data: {
        personId: effectivePersonId || linkedinAccount.personId,
        personName: name,
        personEmail: email || linkedinAccount.personEmail,
        personPicture: picture || linkedinAccount.personPicture,
      },
    });

    // 4. Build text representation for analysis
    const experienceText = profileData.positions
      .map(
        (p) =>
          `- ${p.title} chez ${p.company} (${p.startDate})${p.description ? `\n  ${p.description.slice(0, 300)}` : ''}`
      )
      .join('\n');

    const profileText = `Profil LinkedIn lu automatiquement :
Nom : ${profileData.name}
Email : ${profileData.email || 'Non disponible'}
Titre : ${profileData.headline || 'Non disponible'}
Section À propos : Non disponible via API

Expérience :
${experienceText || 'Aucune expérience récupérée'}

${warnings.length > 0 ? `Note : ${warnings.join('. ')}` : ''}`;

    // 5. Trigger AI analysis with gathered data
    const systemPrompt = `Tu es un expert en optimisation de profils LinkedIn B2B francophones. Tu analyses les profils avec rigueur et fournis des recommandations actionables.

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks). La structure est :
{
  "headlineScore": <number 0-100>,
  "aboutScore": <number 0-100>,
  "experienceScore": <number 0-100>,
  "skillsScore": <number 0-100>,
  "recommendationsScore": <number 0-100>,
  "suggestions": [
    { "priority": "high|medium|low", "category": "headline|about|experience|skills|general", "text": "description", "impact": "high|medium|low" }
  ],
  "optimizedHeadline": "version optimisée du headline (max 120 caractères)",
  "optimizedAbout": "version optimisée de la section about (max 2600 caractères)",
  "topProfiles": [
    { "name": "Nom", "headline": "Headline exemple", "score": 95, "strengths": ["force1", "force2"] }
  ]
}

Critères d'évaluation :
- Headline (0-100) : mots-clés SEO, clarté, valeur ajoutée, longueur optimale (5-10 mots), différenciation
- About (0-100) : storytelling, structure (paragraphes courts), CTA, preuve sociale, longueur (150-2600 car.), pertinence
- Expérience (0-100) : impact mesurable, résultats chiffrés, progression logique, verbes d'action
- Skills (0-100) : pertinence, équilibre hard/soft skills, endorsement, tendance du secteur
- Recommendations (0-100) : diversité, crédibilité, récence, pertinence sectorielle

Si un champ n'est pas fourni ou est "Non disponible", mets un score de 0 et des suggestions ciblées pour l'améliorer.
Sois exigeant mais juste dans ton évaluation. Réponds en français.`;

    const userPrompt = `Analyse le profil LinkedIn suivant (données lues automatiquement via l'API LinkedIn) :
${profileText}

Fournis une analyse complète et des recommandations en français.
Prends en compte que certaines données peuvent ne pas être disponibles via l'API LinkedIn et suggère à l'utilisateur de les compléter manuellement.`;

    const { callAI } = await import('@/lib/ai-providers');
    const aiResult = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.4, maxTokens: 2000 }
    );

    let analysis;
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResult);
    } catch {
      analysis = {
        headlineScore: profileData.headline ? 50 : 0,
        aboutScore: 0,
        experienceScore: profileData.positions.length > 0 ? 40 : 0,
        skillsScore: 0,
        recommendationsScore: 0,
        suggestions: [
          { priority: 'high', category: 'general', text: 'Erreur d\'analyse IA. Veuillez réessayer.', impact: 'high' },
        ],
        optimizedHeadline: profileData.headline || '',
        optimizedAbout: '',
        topProfiles: [],
      };
    }

    const score = Math.round(
      (analysis.headlineScore + analysis.aboutScore + analysis.experienceScore + analysis.skillsScore + analysis.recommendationsScore) / 5
    );

    // 6. Save the analysis
    const saved = await db.profileAnalysis.create({
      data: {
        userId: authUser.id,
        headline: profileData.headline || null,
        about: profileData.about || null,
        score,
        headlineScore: analysis.headlineScore || 0,
        aboutScore: analysis.aboutScore || 0,
        experienceScore: analysis.experienceScore || 0,
        skillsScore: analysis.skillsScore || 0,
        recommendationsScore: analysis.recommendationsScore || 0,
        suggestions: JSON.stringify(analysis.suggestions || []),
        optimizedHeadline: analysis.optimizedHeadline || null,
        optimizedAbout: analysis.optimizedAbout || null,
        topProfiles: analysis.topProfiles ? JSON.stringify(analysis.topProfiles) : null,
      },
    });

    // 7. Log agent activity
    await db.agentActivity.create({
      data: {
        userId: authUser.id,
        agentType: 'profile_optimizer',
        status: 'completed',
        title: `Lecture auto LinkedIn — Score : ${score}/100`,
        description: `Profil LinkedIn lu automatiquement. Nom : ${profileData.name}. ${profileData.headline ? 'Titre récupéré.' : 'Titre non disponible.'} ${profileData.positions.length} position(s) récupérée(s). Score global : ${score}/100.`,
        metadata: JSON.stringify({
          source: 'auto_read',
          fieldsGathered: {
            name: !!profileData.name,
            email: !!profileData.email,
            headline: !!profileData.headline,
            positions: profileData.positions.length,
            about: !!profileData.about,
          },
          warnings: warnings.length,
          score,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      profileData: {
        name: profileData.name,
        email: profileData.email,
        headline: profileData.headline,
        about: profileData.about,
        positions: profileData.positions,
        picture: profileData.picture,
        warnings: profileData.warnings,
      },
      analysis: {
        id: saved.id,
        headline: saved.headline,
        about: saved.about,
        score: saved.score,
        headlineScore: saved.headlineScore,
        aboutScore: saved.aboutScore,
        experienceScore: saved.experienceScore,
        skillsScore: saved.skillsScore,
        recommendationsScore: saved.recommendationsScore,
        suggestions: saved.suggestions ? JSON.parse(saved.suggestions) : [],
        optimizedHeadline: saved.optimizedHeadline,
        optimizedAbout: saved.optimizedAbout,
        topProfiles: saved.topProfiles ? JSON.parse(saved.topProfiles) : [],
        analyzedAt: saved.analyzedAt,
      },
    });
  } catch (error) {
    console.error('[ProfileOptimizer] Auto-read error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
