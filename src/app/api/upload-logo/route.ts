import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, R2_PATHS, generateUniqueFilename } from '@/lib/cloudflare-r2';

/**
 * POST /api/upload-logo
 * 
 * Upload a user's logo to Cloudflare R2
 * Returns a public URL that can be used in render requests
 * 
 * Accepts: multipart/form-data with 'logo' field (image file)
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const logo = formData.get('logo') as File;

        if (!logo) {
            return NextResponse.json(
                { error: 'No logo file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
        if (!validTypes.includes(logo.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Supported: PNG, JPEG, WebP, SVG' },
                { status: 400 }
            );
        }

        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (logo.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB' },
                { status: 400 }
            );
        }

        // Get file extension from MIME type
        const extMap: Record<string, string> = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
        };
        const extension = extMap[logo.type] || 'png';

        // Generate unique filename and upload
        const filename = generateUniqueFilename(extension);
        const key = `${R2_PATHS.uploads}/${filename}`;

        const arrayBuffer = await logo.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const publicUrl = await uploadToR2(buffer, key, logo.type);

        console.log(`Logo uploaded: ${publicUrl}`);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            key: key,
            filename: filename,
            size: logo.size,
        });

    } catch (error) {
        console.error('Logo upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/upload-logo
 * 
 * Get upload requirements
 */
export async function GET() {
    return NextResponse.json({
        info: 'Upload your logo to use in video renders',
        supportedFormats: ['PNG', 'JPEG', 'WebP', 'SVG'],
        maxSize: '10MB',
        usage: {
            step1: 'POST /api/upload-logo with form-data containing "logo" file',
            step2: 'Use returned "url" in POST /api/render as "logoImage" parameter',
        },
        example: {
            renderRequest: {
                templateSlug: 'quicklogoreveal',
                parameters: {
                    logoImage: 'https://your-r2-url.com/uploads/images/your-logo.png'
                }
            }
        }
    });
}
