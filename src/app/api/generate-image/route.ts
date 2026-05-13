import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth_helpers';
import ZAI from 'z-ai-web-dev-sdk';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { prompt, style, size } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });
    }

    // Default style enhancements for LinkedIn professional posts
    const styleMap: Record<string, string> = {
      professionnel: 'professional corporate LinkedIn post visual, clean modern design, business infographic style, muted professional colors, high quality',
      minimaliste: 'minimalist clean design, lots of white space, modern typography, elegant, professional LinkedIn banner style',
      infographie: 'data visualization infographic style, clean charts and icons, professional LinkedIn carousel style, blue and white tones',
      citation: 'inspirational quote card design, elegant typography overlay, gradient background, LinkedIn thought leadership style',
      paysage: 'stunning professional photography, corporate quality, LinkedIn featured image style, natural lighting',
    };

    const selectedStyle = styleMap[style || 'professionnel'] || styleMap.professionnel;
    const fullPrompt = `${prompt}. ${selectedStyle}. 4:3 aspect ratio, no text overlay, no watermarks, high resolution, suitable for LinkedIn post.`;

    // Call AI image generation
    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: fullPrompt,
      size: (size === 'carrousel') ? '864x1152' : '1024x1024',
    });

    const base64Data = response.data?.[0]?.base64;
    if (!base64Data) {
      return NextResponse.json({ error: 'L\'IA n\'a pas pu générer l\'image' }, { status: 500 });
    }

    // Determine image format
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = 'png';
    const mimeType = 'image/png';

    // Save to public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `ai-${crypto.randomBytes(8).toString('hex')}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      prompt: fullPrompt,
      size: buffer.length,
    });
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'image' },
      { status: 500 }
    );
  }
}
