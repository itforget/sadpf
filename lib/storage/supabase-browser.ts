interface SignedUploadInput {
  file: File;
  signedUrl: string;
  onProgress: (progress: number) => void;
}

export async function uploadSupabaseSignedFile({ file, signedUrl, onProgress }: SignedUploadInput) {
  onProgress(0);
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/pdf',
      'Cache-Control': 'max-age=0',
      'x-upsert': 'false',
    },
    body: file,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || payload?.error || 'Não foi possível enviar o arquivo.');
  }

  onProgress(100);
}
