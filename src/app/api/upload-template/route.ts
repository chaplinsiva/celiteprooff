import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, R2_PATHS, getR2PublicUrl } from '@/lib/cloudflare-r2';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * POST /api/upload-template
 * 
 * Upload an After Effects template ZIP to Cloudflare R2
 * Can be used via:
 * 1. File upload (multipart/form-data with 'file' field)
 * 2. Local file path (JSON body with 'localPath' field for server-side files)
 */
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            // Handle file upload
            const formData = await request.formData();
            const file = formData.get('file') as File;
            const templateName = formData.get('templateName') as string;

            if (!file) {
                return NextResponse.json(
                    { error: 'No file provided' },
                    { status: 400 }
                );
            }

            if (!templateName) {
                return NextResponse.json(
                    { error: 'templateName is required' },
                    { status: 400 }
                );
            }

            // Validate file type
            if (!file.name.endsWith('.zip')) {
                return NextResponse.json(
                    { error: 'File must be a ZIP archive' },
                    { status: 400 }
                );
            }

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const key = `${R2_PATHS.templates}/${templateName}.zip`;

            const publicUrl = await uploadToR2(buffer, key, 'application/zip');

            return NextResponse.json({
                success: true,
                templateName,
                key,
                url: publicUrl,
            });
        } else {
            // Handle JSON body with local path (for development/testing)
            const body = await request.json();
            const { localPath, templateName } = body;

            if (!localPath || !templateName) {
                return NextResponse.json(
                    { error: 'localPath and templateName are required' },
                    { status: 400 }
                );
            }

            // Read file from local filesystem
            const buffer = readFileSync(localPath);
            const key = `${R2_PATHS.templates}/${templateName}.zip`;

            const publicUrl = await uploadToR2(buffer, key, 'application/zip');

            return NextResponse.json({
                success: true,
                templateName,
                key,
                url: publicUrl,
            });
        }
    } catch (error) {
        console.error('Template upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/upload-template
 * 
 * List expected templates
 */
export async function GET() {
    return NextResponse.json({
        info: 'Upload After Effects templates to Cloudflare R2',
        expectedTemplates: [
            {
                name: 'quicklogoreveal',
                expectedPath: `${R2_PATHS.templates}/quicklogoreveal.zip`,
                expectedUrl: getR2PublicUrl(`${R2_PATHS.templates}/quicklogoreveal.zip`),
            },
        ],
        uploadMethods: [
            'POST with multipart/form-data: file (ZIP) and templateName fields',
            'POST with JSON: { localPath: "path/to/file.zip", templateName: "name" }',
        ],
    });
}
