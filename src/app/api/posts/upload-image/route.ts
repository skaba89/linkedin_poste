import { NextResponse } from 'next/server';
import { getAuthUser, hasRole } from '@/lib/auth_helpers';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

/**
 * POST /api/posts/upload-image
 *
 * Accepts multipart form data with an image file.
 * Validates type/size, resizes with Sharp if needed, saves to public/uploads/posts/.
 * Returns the public URL path.
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!hasRole(authUser, 'admin', 'editor')) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type non supporté. Utilisez JPG, PNG, WebP ou GIF.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 5 Mo)' },
        { status: 400 }
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    let imageBuffer = Buffer.from(arrayBuffer);

    // Determine output extension
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    let ext = extMap[file.type] || 'jpg';

    // Process image with Sharp
    try {
      let pipeline = sharp(imageBuffer);

      // Get metadata to check dimensions
      const metadata = await pipeline.metadata();

      // Resize if larger than LinkedIn recommended 1200x627
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 627;
      const needsResize =
        (metadata.width && metadata.width > MAX_WIDTH) ||
        (metadata.height && metadata.height > MAX_HEIGHT);

      if (needsResize) {
        pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert non-JPEG to JPEG for better compression (except GIF)
      if (file.type !== 'image/gif') {
        pipeline = pipeline.jpeg({ quality: 85 });
        ext = 'jpg';
        imageBuffer = await pipeline.toBuffer();
      } else {
        imageBuffer = await pipeline.toBuffer();
      }
    } catch {
      // If Sharp fails, use the original buffer
      console.warn('Sharp processing failed, using original image');
    }

    // Ensure the image doesn't exceed 4 MB (LinkedIn max)
    const LINKEDIN_MAX_SIZE = 4 * 1024 * 1024;
    if (imageBuffer.length > LINKEDIN_MAX_SIZE) {
      try {
        // Try re-compressing at lower quality
        imageBuffer = await sharp(imageBuffer)
          .resize(1200, 627, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer();
        ext = 'jpg';
      } catch {
        // If still too large, return error
        return NextResponse.json(
          { error: "L'image est trop volumineuse même après compression (max 4 Mo pour LinkedIn)" },
          { status: 400 }
        );
      }
    }

    // Save to public/uploads/posts/
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'posts');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `post-${crypto.randomBytes(8).toString('hex')}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await writeFile(filepath, imageBuffer);

    const imageUrl = `/uploads/posts/${filename}`;

    return NextResponse.json({
      success: true,
      url: imageUrl,
      size: imageBuffer.length,
      filename,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload de l'image" },
      { status: 500 }
    );
  }
}
