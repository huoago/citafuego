import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

export class InvalidUploadedImageError extends Error {}

const mimeToFormat: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character);
}

function watermarkSvg(width: number, height: number, text: string) {
  const label = escapeXml(`© ${text.trim().slice(0, 40)} · CitaFuego`);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="wm" width="440" height="220" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
        <text x="16" y="112" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="white" fill-opacity="0.20" stroke="black" stroke-opacity="0.16" stroke-width="1">${label}</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#wm)"/>
  </svg>`);
}

export async function sanitizePrivateStorageImage(args: {
  client: SupabaseClient;
  bucket: string;
  rawPath: string;
  ownerId: string;
  prefix: string;
  expectedMimeType: string;
  maxBytes?: number;
  watermarkText?: string | null;
}) {
  const storage = args.client.storage.from(args.bucket);
  const { data, error } = await storage.download(args.rawPath);
  if (error || !data) throw new InvalidUploadedImageError('uploaded_object_not_found');
  if (data.size <= 0 || data.size > (args.maxBytes ?? 8 * 1024 * 1024)) throw new InvalidUploadedImageError('image_size_invalid');
  const expected = mimeToFormat[args.expectedMimeType];
  if (!expected) throw new InvalidUploadedImageError('mime_not_allowed');
  const input = Buffer.from(await data.arrayBuffer());

  try {
    const meta = await sharp(input, { failOn: 'warning', limitInputPixels: 40_000_000, pages: 1 }).metadata();
    if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format) || meta.format !== expected || !meta.width || !meta.height || meta.width < 240 || meta.height < 240 || (meta.pages ?? 1) !== 1) {
      throw new InvalidUploadedImageError('image_invalid_or_mime_mismatch');
    }

    const base = await sharp(input, { failOn: 'warning', limitInputPixels: 40_000_000, pages: 1 })
      .autoOrient()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    const baseMeta = await sharp(base).metadata();
    if (!baseMeta.width || !baseMeta.height) throw new InvalidUploadedImageError('image_decode_failed');

    const output = args.watermarkText?.trim()
      ? await sharp(base)
          .composite([{ input: watermarkSvg(baseMeta.width, baseMeta.height, args.watermarkText), blend: 'over' }])
          .webp({ quality: 88 })
          .toBuffer()
      : base;

    const finalPath = `${args.ownerId}/${args.prefix}-${randomUUID()}.webp`;
    const { error: uploadError } = await storage.upload(finalPath, output, { contentType: 'image/webp', upsert: false });
    if (uploadError) throw uploadError;
    await storage.remove([args.rawPath]);
    return { storagePath: finalPath, size: output.length, width: baseMeta.width, height: baseMeta.height };
  } catch (cause) {
    await storage.remove([args.rawPath]);
    if (cause instanceof InvalidUploadedImageError) throw cause;
    throw new InvalidUploadedImageError('image_decode_failed');
  }
}
