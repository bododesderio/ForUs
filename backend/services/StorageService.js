import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger.js';

// Cloudflare R2 is S3-compatible; region is always 'auto'.
const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT, // https://<account_id>.r2.cloudflarestorage.com
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET || 'forus-uploads';
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // custom domain or https://pub-<hash>.r2.dev

export const uploadFile = async (buffer, originalName, mimetype) => {
    const ext = originalName?.includes('.') ? originalName.split('.').pop() : 'bin';
    const key = `${uuid()}.${ext}`;
    await client.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: mimetype }),
    );
    return `${PUBLIC_URL}/${key}`;
};

export const deleteFile = async (fileUrl) => {
    try {
        const key = fileUrl.split('/').pop();
        await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (error) {
        logger.error({ error, fileUrl }, 'Failed to delete file from R2');
    }
};
