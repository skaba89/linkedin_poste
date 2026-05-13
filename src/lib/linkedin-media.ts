/**
 * LinkedIn image upload helpers.
 *
 * LinkedIn image uploads follow a 3-step process:
 * 1. Register upload → receive uploadUrl + asset URN
 * 2. PUT binary to uploadUrl
 * 3. Use asset URN in post creation
 */

import { LINKEDIN_BASE_URL, linkedinHeaders } from './linkedin-config';
import { readFile } from 'fs/promises';
import path from 'path';

interface RegisterUploadResult {
  uploadUrl: string;
  asset: string;
  uploadHeaders: Record<string, string>;
}

/**
 * Step 1: Register image upload with LinkedIn.
 * Returns the upload URL, asset URN, and headers required for step 2.
 *
 * @param accessToken - LinkedIn OAuth access token
 * @param owner - Full owner URN, e.g. `urn:li:organization:123` or `urn:li:person:456`
 */
export async function registerImageUpload(
  accessToken: string,
  owner: string
): Promise<RegisterUploadResult> {
  const response = await fetch(
    `${LINKEDIN_BASE_URL}/images?action=initializeUpload`,
    {
      method: 'POST',
      headers: linkedinHeaders(accessToken),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as Record<string, string>).message ||
        `LinkedIn image register failed: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    value: {
      uploadMechanism: { uploadUrl: string; uploadHeaders: Record<string, string> }[];
      asset: string;
    };
  };

  const mechanism = data.value.uploadMechanism[0];

  return {
    uploadUrl: mechanism.uploadUrl,
    asset: data.value.asset,
    uploadHeaders: mechanism.uploadHeaders,
  };
}

/**
 * Step 2: Upload raw image binary to LinkedIn's upload URL.
 * Uses the uploadUrl and specific headers from step 1.
 */
export async function uploadImageToLinkedIn(
  uploadUrl: string,
  imageBuffer: Buffer,
  headers: Record<string, string>
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: new Uint8Array(imageBuffer),
  });

  if (!response.ok) {
    throw new Error(`LinkedIn image upload failed: ${response.status}`);
  }
}

/**
 * Step 3: Complete the full flow — reads image, registers, uploads, returns asset URN.
 *
 * Supports multiple image URL formats:
 * - `/images/...` or `/uploads/...` → reads from local filesystem (public dir)
 * - `http://...` or `https://...` → fetches the image remotely
 * - `data:image/...;base64,...` → decodes base64 data URI
 *
 * @param accessToken - LinkedIn OAuth access token
 * @param owner - Full owner URN, e.g. `urn:li:organization:123` or `urn:li:person:456`
 * @param imageUrl - Image source (local path, remote URL, or base64 data URI)
 */
export async function uploadImageToLinkedInComplete(
  accessToken: string,
  owner: string,
  imageUrl: string
): Promise<string> {
  // Obtain image buffer from various sources
  let imageBuffer: Buffer;

  if (imageUrl.startsWith('data:')) {
    // Base64 data URI — extract the base64 part after the comma
    const base64Match = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Format de data URI invalide');
    }
    imageBuffer = Buffer.from(base64Match[1], 'base64');
  } else if (
    imageUrl.startsWith('/images/') ||
    imageUrl.startsWith('/uploads/')
  ) {
    const filePath = path.join(process.cwd(), 'public', imageUrl);
    imageBuffer = await readFile(filePath);
  } else if (imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Impossible de télécharger l'image distante: ${res.status}`);
    }
    const arrayBuf = await res.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuf);
  } else {
    throw new Error("Format d'URL d'image non supporté");
  }

  // Validate buffer
  if (imageBuffer.length === 0) {
    throw new Error("L'image est vide");
  }

  // Step 1 — register
  const { uploadUrl, asset, uploadHeaders } = await registerImageUpload(
    accessToken,
    owner
  );

  // Step 2 — upload binary
  await uploadImageToLinkedIn(uploadUrl, imageBuffer, uploadHeaders);

  // Step 3 — return asset URN
  return asset;
}
