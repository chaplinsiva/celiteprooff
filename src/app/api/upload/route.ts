import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, R2_PATHS, generateUniqueFilename } from '@/lib/cloudflare-r2';

/**
 * POST /api/upload
 * 
 * Upload an image to Cloudflare R2 and return public URL
 * Used for logo uploads before rendering with Plainly
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const extension = file.name.split('.').pop() || 'png';
        const fileName = generateUniqueFilename(extension);
        const key = `${R2_PATHS.uploads}/${fileName}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudflare R2
        const publicUrl = await uploadToR2(buffer, key, file.type);

        console.log(`Uploaded logo to R2: ${publicUrl}`);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            key: key,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}
