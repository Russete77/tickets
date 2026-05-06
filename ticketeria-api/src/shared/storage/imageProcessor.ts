import sharp from 'sharp';
import { BadRequestError } from '../errors';

export interface ProcessedImage {
  buffer: Buffer;
  contentType: 'image/jpeg';
}

/**
 * Resize cover 800x800, JPEG q85, strip EXIF.
 * Lança BadRequestError se input não for imagem válida.
 */
export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  try {
    const buffer = await sharp(input)
      .rotate() // respeita EXIF orientation antes de strip
      .resize(800, 800, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: 'image/jpeg' };
  } catch (err) {
    throw new BadRequestError('Imagem inválida ou corrompida', { cause: String(err) });
  }
}
