import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Generates a LinkedIn post image using z-ai-web-dev-sdk
 * and saves it to the public/images/posts/ directory.
 */
export async function generatePostImage(subject: string, postId: string): Promise<string | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: `Professional LinkedIn post image about: ${subject}. Modern, clean, data/technology themed, business-appropriate style. No text overlays. High quality.`,
      size: '1344x768',
    });

    const imageData = response.data?.[0]?.base64;
    if (!imageData) return null;

    const dir = path.join(process.cwd(), 'public', 'images', 'posts');
    await mkdir(dir, { recursive: true });

    const filename = `${postId}.png`;
    const filePath = path.join(dir, filename);

    const buffer = Buffer.from(imageData, 'base64');
    await writeFile(filePath, buffer);

    return `/images/posts/${filename}`;
  } catch (error) {
    console.error('Image generation failed:', error);
    return null;
  }
}
