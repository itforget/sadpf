import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageDriver } from './index';

function getClient() {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3_ENDPOINT, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY são obrigatórias para MinIO/S3.'
    );
  }

  return new S3Client({
    endpoint,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket() {
  return process.env.STORAGE_BUCKET || 'sadpf-documentos';
}

export const minioStorage: StorageDriver = {
  backend: 's3',

  async upload(buffer, key, mimeType) {
    await getClient().send(
      new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: buffer, ContentType: mimeType })
    );
    return { backend: 's3', key };
  },

  async download(key) {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key })
    );
    if (!response.Body) throw new Error('Objeto não encontrado no MinIO/S3.');
    return Buffer.from(await response.Body.transformToByteArray());
  },

  async delete(key) {
    await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  },
};
