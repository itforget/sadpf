import * as tus from 'tus-js-client';

interface ResumableUploadInput {
  bucket: string;
  file: File;
  resumableUrl: string;
  storageKey: string;
  token: string;
  onProgress: (progress: number) => void;
}

export async function uploadSupabaseResumableFile({
  bucket,
  file,
  resumableUrl,
  storageKey,
  token,
  onProgress,
}: ResumableUploadInput) {
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: resumableUrl,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { 'x-signature': token },
      metadata: {
        bucketName: bucket,
        objectName: storageKey,
        contentType: file.type || 'application/pdf',
        cacheControl: '0',
      },
      onError: reject,
      onProgress: (uploaded, total) => onProgress(Math.round((uploaded / total) * 100)),
      onSuccess: () => resolve(),
    });

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(reject);
  });
}
