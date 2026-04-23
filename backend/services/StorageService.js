import Minio from 'minio';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger.js';

const client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.NODE_ENV === 'production',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET = process.env.MINIO_BUCKET || 'forus-uploads';

// Ensure bucket exists on startup
export const ensureBucket = async () => {
    try {
        const exists = await client.bucketExists(BUCKET);
        if (!exists) {
            await client.makeBucket(BUCKET, 'us-east-1');
            logger.info(`MinIO bucket '${BUCKET}' created`);
        }
    } catch (error) {
        logger.error({ error }, 'Failed to ensure MinIO bucket');
    }
};

export const uploadFile = async (buffer, originalName, mimetype) => {
    const ext = originalName.split('.').pop();
    const filename = `${uuid()}.${ext}`;
    await client.putObject(BUCKET, filename, buffer, buffer.length, { 'Content-Type': mimetype });
    const host = process.env.MINIO_PUBLIC_URL || `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
    return `${host}/${BUCKET}/${filename}`;
};

export const deleteFile = async (fileUrl) => {
    try {
        const filename = fileUrl.split('/').pop();
        await client.removeObject(BUCKET, filename);
    } catch (error) {
        logger.error({ error, fileUrl }, 'Failed to delete file from MinIO');
    }
};
