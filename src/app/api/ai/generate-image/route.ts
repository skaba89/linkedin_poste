import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, size } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });
    }

    const validSizes = ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440'];
    const imageSize = validSizes.includes(size) ? size : '1024x1024';

    try {
      // Dynamic import to avoid build-time issues
      const mod = await import('z-ai-web-dev-sdk');
      const ZAI = (mod as { default: typeof import('z-ai-web-dev-sdk').default }).default;
      const zai = await ZAI.create();

      // Add timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await zai.images.generations.create({
        prompt: `Professional LinkedIn post image: ${prompt}. Clean, modern, business-appropriate style. No text overlays.`,
        size: imageSize as '1024x1024',
      });

      clearTimeout(timeoutId);

      const imageData = response.data?.[0];
      if (!imageData?.base64) {
        return NextResponse.json({ error: 'Échec de la génération d\'image' }, { status: 500 });
      }

      return NextResponse.json({
        image: `data:image/png;base64,${imageData.base64}`,
      });
    } catch (aiError: unknown) {
      const msg = aiError instanceof Error ? aiError.message : 'Erreur AI';
      console.error('Image generation error:', msg);
      return NextResponse.json({ error: `Erreur de génération: ${msg}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
