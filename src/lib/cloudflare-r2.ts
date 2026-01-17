/**
 * Cloudflare R2 Storage Client
 * 
 * Handles file uploads/downloads to Cloudflare R2 (S3-compatible storage)
 * for template assets and render outputs.
 * 
 * Required environment variables:
 * - S3_ENDPOINT: R2 endpoint URL (e.g., https://xxx.r2.cloudflarestorage.com)
 * - S3_ACCESS_KEY_ID: R2 access key ID
 * - S3_SECRET_ACCESS_KEY: R2 secret access key
 * - PUBLIC_URL_S3: Public URL for the bucket
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

// R2 configuration from environment
const R2_ENDPOINT = process.env.S3_ENDPOINT || '';
const R2_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || '';
const R2_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || '';
const R2_PUBLIC_URL = process.env.PUBLIC_URL_S3 || '';
const R2_BUCKET = 'celitepro';

// Singleton client instance
let r2Client: S3Client | null = null;

/**
 * Get or create R2 client instance
 */
function getR2Client(): S3Client {
    if (r2Client) {
        return r2Client;
    }

    if (!R2_ACCESS_KEY || !R2_SECRET_KEY) {
        throw new Error(
            'R2 credentials not configured. Add S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY to .env'
        );
    }

    // Use endpoint or parse from fallback
    let endpoint = R2_ENDPOINT;
    if (!endpoint) {
        // Fallback - try to parse from old S3_API env var
        const fallback = process.env.S3_API || '';
        if (fallback) {
            endpoint = fallback.replace(/\/celitepro$/, '');
        }
    }

    if (!endpoint) {
        throw new Error('R2 endpoint not configured. Add S3_ENDPOINT to .env');
    }

    r2Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
            accessKeyId: R2_ACCESS_KEY,
            secretAccessKey: R2_SECRET_KEY,
        },
    });

    return r2Client;
}

/**
 * Upload a file to R2 storage
 * @param buffer - File buffer
 * @param key - Storage path (e.g., 'uploads/images/logo.png')
 * @param contentType - MIME type
 * @returns Public URL of uploaded file
 */
export async function uploadToR2(
    buffer: Buffer,
    key: string,
    contentType: string
): Promise<string> {
    const client = getR2Client();

    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));

    // Return public URL
    return getR2PublicUrl(key);
}

/**
 * Upload a file from URL to R2 storage
 * Downloads the file and re-uploads to R2
 * @param url - Source URL to download from
 * @param key - Storage path (e.g., 'renders/output.mp4')
 * @returns Public URL of uploaded file
 */
export async function uploadFromUrlToR2(
    url: string,
    key: string
): Promise<string> {
    console.log(`Downloading from: ${url}`);

    // Download the file
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download from ${url}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'video/mp4';

    console.log(`Downloaded ${buffer.length} bytes, uploading to R2...`);

    return uploadToR2(buffer, key, contentType);
}

/**
 * Delete a file from R2 storage
 * @param key - Storage path to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
    const client = getR2Client();

    await client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    }));

    console.log(`Deleted from R2: ${key}`);
}

/**
 * Get public URL for a R2 file
 * @param key - Storage path
 * @returns Public URL (properly URL-encoded)
 */
export function getR2PublicUrl(key: string): string {
    // Encode each path segment to handle spaces and special characters
    const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${R2_PUBLIC_URL}/${encodedKey}`;
}

/**
 * Template paths in R2
 */
export const R2_PATHS = {
    templates: 'templates',
    uploads: 'uploads/images',
    renders: 'renders',
} as const;

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(extension: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomId}.${extension}`;
}

/**
 * List objects in R2 storage
 * @param prefix - Prefix to filter objects (e.g., 'templates/')
 * @returns Array of object keys
 */
export async function listR2Objects(prefix: string = ''): Promise<string[]> {
    const client = getR2Client();
    const objects: string[] = [];
    let continuationToken: string | undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        });

        const response = await client.send(command);
        
        if (response.Contents) {
            objects.push(...response.Contents.map(obj => obj.Key || '').filter(Boolean));
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
}

/**
 * Download a file from R2 storage
 * @param key - Storage path to download
 * @returns File buffer
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
    const client = getR2Client();

    const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    });

    const response = await client.send(command);
    
    if (!response.Body) {
        throw new Error(`No content found for key: ${key}`);
    }

    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }

    return Buffer.concat(chunks);
}

/**
 * Check if a file exists in R2
 * @param key - Storage path to check
 * @returns true if file exists, false otherwise
 */
export async function fileExistsInR2(key: string): Promise<boolean> {
    try {
        const client = getR2Client();
        // Use HeadObjectCommand if available, otherwise try to list objects with prefix
        const listCommand = new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: key,
            MaxKeys: 1,
        });
        
        const response = await client.send(listCommand);
        // Check if any object matches exactly
        const exists = response.Contents?.some(obj => obj.Key === key) || false;
        return exists;
    } catch (error: any) {
        console.error(`Error checking file existence in R2:`, error);
        // If we can't check, assume it might exist and let the public URL check handle it
        return true;
    }
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
    return !!(R2_ACCESS_KEY && R2_SECRET_KEY && (R2_ENDPOINT || process.env.S3_API));
}
