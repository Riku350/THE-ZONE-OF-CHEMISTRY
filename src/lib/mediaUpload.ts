export async function compressImagePreservingAspect(
  file: File,
  maxDimension = 1600,
  quality = 0.86
): Promise<{ dataUrl: string; mimeType: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image'));
      img.onload = () => {
        const origW = img.width;
        const origH = img.height;
        let width = origW;
        let height = origH;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const targetMime = file.type === 'image/png' ? 'image/webp' : 'image/webp';
        let dataUrl = canvas.toDataURL(targetMime, quality);
        if (dataUrl.length > 480_000) {
          dataUrl = canvas.toDataURL('image/webp', 0.74);
        }
        if (dataUrl.length > 520_000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.68);
        }
        resolve({ dataUrl, mimeType: targetMime, width: origW, height: origH });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export async function uploadDirectMediaToServer(
  file: File,
  token: string,
  courseId = ''
): Promise<{ mediaId: string; streamUrl: string }> {
  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-file-name': encodeURIComponent(file.name),
      'x-course-id': courseId,
    },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.streamUrl) {
    throw new Error(data?.error || 'Direct server upload failed');
  }
  return { mediaId: data.mediaId, streamUrl: data.streamUrl };
}

export async function uploadMediaFile(
  file: File,
  token?: string | null,
  options?: { maxDimension?: number; folder?: string; courseId?: string }
): Promise<string> {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const isVideo = file.type.startsWith('video/');

  if (isVideo) {
    if (!token) throw new Error('Staff sign-in required for direct video upload.');
    const uploaded = await uploadDirectMediaToServer(file, token, options?.courseId || '');
    return uploaded.streamUrl;
  }

  if (!isImage && !isPdf) {
    throw new Error('Only JPG, JPEG, PNG, WEBP images, PDFs, or MP4/WebM videos are supported.');
  }

  if (isImage) {
    const compressed = await compressImagePreservingAspect(file, options?.maxDimension || 1400, 0.84);
    return compressed.dataUrl;
  }

  if (file.size > 650 * 1024) {
    if (token) {
      const uploaded = await uploadDirectMediaToServer(file, token, options?.courseId || '');
      return uploaded.streamUrl;
    }
    throw new Error('PDF exceeds 650KB inline limit. Sign in as Teacher/Admin or paste a cloud PDF link.');
  }
  return await readFileAsDataUrl(file);
}
