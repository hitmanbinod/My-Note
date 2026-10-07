/**
 * Convert an image File to a base64 data URL, downscaling large images so
 * embedded notes stay reasonable in size (target: under ~2 MB before encode).
 */
export async function fileToDataUrl(file: File, maxDimension = 1600, maxRawBytes = 2 * 1024 * 1024): Promise<string> {
  const readAsDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read the image file.'));
      reader.readAsDataURL(file);
    });

  const dataUrl = await readAsDataUrl();
  if (file.size <= maxRawBytes) return dataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not decode the image file.'));
    element.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}
