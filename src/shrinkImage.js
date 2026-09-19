// Scales large photos down in the browser before upload.
// GIFs are left alone, since redrawing them would drop their animation.

const MAX_SIDE = 2000; // pixels, longest side
const QUALITY = 0.85; // for JPEG and WebP
const SHRINKABLE = ['image/jpeg', 'image/png', 'image/webp'];

export async function shrinkImage(file) {
  if (!SHRINKABLE.includes(file.type)) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // the browser couldn't decode it; let the server decide
  }

  const scale = MAX_SIDE / Math.max(bitmap.width, bitmap.height);
  if (scale >= 1) {
    bitmap.close();
    return file; // already small enough
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, QUALITY));
  if (!blob || blob.size >= file.size) return file;

  // blob.type can differ from file.type if the browser can't encode that format (it falls back to PNG).
  return new File([blob], file.name, { type: blob.type });
}