import { NextRequest, NextResponse } from 'next/server';
import {
    createProject,
    waitForProjectReady,
    createManualTemplate,
    renderTemplate,
    waitForRender,
    deleteProject,
} from '@/lib/plainly';
import { uploadFromUrlToR2, R2_PATHS, generateUniqueFilename, getR2PublicUrl, fileExistsInR2 } from '@/lib/cloudflare-r2';

// Template configurations stored on Cloudflare R2
const TEMPLATE_CONFIG = {
    quicklogoreveal: {
        name: 'Quick Logo Sting',
        zipPath: 'templates/Quick Logo Reveal.zip', // Path on R2 (with spaces)
        compositionName: 'Quick Logo Sting', // AE composition name
        logoLayerName: 'PNG2.png', // AE layer name (image layer)
        parameterKey: 'png2Png', // Parameter key for rendering (Plainly API parameter name)
    },
};

/**
 * POST /api/render
 * 
 * Dynamic Render Flow:
 * 1. Get template ZIP URL from Cloudflare R2
 * 2. Create temporary project in Plainly from the ZIP
 * 3. Wait for project analysis
 * 4. Create manual template with composition "Quick Logo Sting" and layer "PNG2.png" (autoscale)
 * 5. Render with user's logo
 * 6. Upload output video to Cloudflare R2
 * 7. DELETE the entire project from Plainly (cleanup)
 * 8. Return Cloudflare video URL
 */
export async function POST(request: NextRequest) {
    let projectId: string | null = null;

    try {
        const body = await request.json();
        const { templateSlug, parameters } = body;

        // Validate template exists
        const templateConfig = TEMPLATE_CONFIG[templateSlug as keyof typeof TEMPLATE_CONFIG];
        if (!templateConfig) {
            return NextResponse.json(
                { error: `Unknown template: ${templateSlug}. Available: ${Object.keys(TEMPLATE_CONFIG).join(', ')}` },
                { status: 400 }
            );
        }

        // Validate logo parameter
        const logoImage = parameters?.logoImage || parameters?.lOGO;
        if (!logoImage) {
            return NextResponse.json(
                { error: 'logoImage parameter is required' },
                { status: 400 }
            );
        }

        console.log(`\n=== RENDER START ===`);
        console.log(`Template: ${templateSlug}`);
        console.log(`Logo URL: ${logoImage}`);

        // Step 1: Get template ZIP URL from Cloudflare R2
        const templateZipUrl = getR2PublicUrl(templateConfig.zipPath);
        console.log(`\n[1/7] Template ZIP Path: ${templateConfig.zipPath}`);
        console.log(`Template ZIP URL: ${templateZipUrl}`);
        
        // Verify the file exists in R2
        console.log(`Verifying file exists in R2...`);
        try {
            const exists = await fileExistsInR2(templateConfig.zipPath);
            if (!exists) {
                return NextResponse.json(
                    {
                        error: `Template ZIP file not found in R2`,
                        path: templateConfig.zipPath,
                        url: templateZipUrl,
                        suggestion: 'Please upload the template ZIP file to R2 first using /api/upload-template',
                    },
                    { status: 400 }
                );
            }
            console.log(`✅ File exists in R2`);
        } catch (r2Error) {
            console.error(`❌ R2 check failed:`, r2Error);
            return NextResponse.json(
                {
                    error: `Failed to verify file in R2`,
                    details: r2Error instanceof Error ? r2Error.message : 'Unknown error',
                },
                { status: 500 }
            );
        }
        
        // Verify the URL is publicly accessible (test with both HEAD and GET like Plainly will do)
        console.log(`Verifying ZIP URL is publicly accessible...`);
        try {
            // First try HEAD request
            const headResponse = await fetch(templateZipUrl, { 
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; PlainlyBot/1.0)',
                }
            });
            if (!headResponse.ok) {
                throw new Error(`ZIP file not accessible via public URL: ${headResponse.status} ${headResponse.statusText}`);
            }
            const contentLength = headResponse.headers.get('content-length');
            const contentType = headResponse.headers.get('content-type');
            console.log(`✅ HEAD request successful (Size: ${contentLength} bytes, Type: ${contentType})`);
            
            // Also try a partial GET request to simulate what Plainly will do
            console.log(`Testing GET request (downloading first 1KB)...`);
            const getResponse = await fetch(templateZipUrl, {
                method: 'GET',
                headers: {
                    'Range': 'bytes=0-1023', // Download first 1KB
                    'User-Agent': 'Mozilla/5.0 (compatible; PlainlyBot/1.0)',
                }
            });
            
            if (!getResponse.ok && getResponse.status !== 206) { // 206 is Partial Content, which is OK
                throw new Error(`GET request failed: ${getResponse.status} ${getResponse.statusText}`);
            }
            
            const partialData = await getResponse.arrayBuffer();
            console.log(`✅ GET request successful (downloaded ${partialData.byteLength} bytes)`);
            
            // Verify it looks like a ZIP file (ZIP files start with PK\x03\x04 or PK\x05\x06)
            if (partialData.byteLength > 0) {
                const firstBytes = new Uint8Array(partialData.slice(0, 4));
                const isZip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B; // "PK" signature
                if (!isZip) {
                    console.warn(`⚠️ Warning: File doesn't appear to be a ZIP file (first bytes: ${Array.from(firstBytes).map(b => '0x' + b.toString(16)).join(' ')})`);
                } else {
                    console.log(`✅ File appears to be a valid ZIP file`);
                }
            }
            
            if (contentType && !contentType.includes('zip') && !contentType.includes('octet-stream') && !contentType.includes('application/x-zip')) {
                console.warn(`⚠️ Warning: Content-Type is ${contentType}, expected application/zip or application/x-zip-compressed`);
            }
            
            console.log(`✅ ZIP file is publicly accessible and downloadable`);
        } catch (urlError) {
            console.error(`❌ Public URL verification failed:`, urlError);
            return NextResponse.json(
                {
                    error: `Template ZIP file is not publicly accessible or downloadable`,
                    url: templateZipUrl,
                    details: urlError instanceof Error ? urlError.message : 'Unknown error',
                    suggestion: [
                        '1. Verify PUBLIC_URL_S3 is correctly configured',
                        '2. Ensure R2 bucket has public access enabled',
                        '3. Check that the file exists at the path: ' + templateConfig.zipPath,
                        '4. Try accessing the URL directly in a browser to verify it works',
                    ],
                },
                { status: 400 }
            );
        }

        // Step 2: Create temporary project in Plainly from the ZIP
        const timestamp = Date.now();
        const projectName = `render-${templateSlug}-${timestamp}`;
        console.log(`\n[2/7] Creating Plainly project: ${projectName}`);

        const project = await createProject(projectName, templateZipUrl);
        projectId = project.id;
        console.log(`Project created: ${projectId}`);

        // Step 3: Wait for project to be analyzed and ready
        console.log(`\n[3/7] Waiting for project analysis...`);
        await waitForProjectReady(projectId, 60, 3000);
        console.log(`Project is render-ready`);

        // Step 4: Create manual template with specific composition and layer (autoscale enabled)
        console.log(`\n[4/7] Creating template with composition "${templateConfig.compositionName}" and layer "${templateConfig.logoLayerName}" (autoscale enabled)...`);
        const template = await createManualTemplate(
            projectId,
            `${templateConfig.name}-template`,
            templateConfig.compositionName,
            templateConfig.logoLayerName
        );
        const templateId = template.id;
        console.log(`✅ Template created with autoscale`);
        console.log(`Template ID from response: ${templateId}`);
        console.log(`Project ID: ${projectId}`);
        console.log(`Template object:`, JSON.stringify(template, null, 2));
        
        // Verify template ID is different from project ID
        if (templateId === projectId) {
            console.error(`⚠️ ERROR: Template ID matches Project ID! This is incorrect.`);
            console.error(`Template response structure:`, Object.keys(template));
            console.error(`Full template response:`, JSON.stringify(template, null, 2));
            
            // Try to find the actual template ID in the response
            const possibleTemplateId = (template as any).templateId || (template as any).template_id || (template as any).uuid;
            if (possibleTemplateId && possibleTemplateId !== projectId) {
                console.log(`Found alternative template ID: ${possibleTemplateId}`);
                // Use the alternative ID
                const correctedTemplate = { ...template, id: possibleTemplateId };
                return NextResponse.json(
                    {
                        error: `Template ID extraction issue detected. Template ID should be different from Project ID.`,
                        projectId: projectId,
                        extractedTemplateId: templateId,
                        alternativeTemplateId: possibleTemplateId,
                        templateResponse: correctedTemplate,
                        suggestion: 'Please check the Plainly API response structure for template creation',
                    },
                    { status: 500 }
                );
            }
        }
        
        // Get the actual parameter name from the template response
        // Plainly returns parameters in the template, we need to extract the value (without #)
        const templateParameters = (template as any).parameters || (template as any).layers || [];
        let actualParameterName = templateConfig.parameterKey; // Default fallback
        
        if (templateParameters.length > 0) {
            // Look for the parametrization value
            const param = templateParameters[0];
            const paramValue = param.value || param.parameterName || param.name || param.key;
            
            if (paramValue) {
                // Remove # prefix if present (Plainly uses # in value but we render without it)
                actualParameterName = paramValue.toString().replace(/^#/, '');
                console.log(`Found parameter value in template: "${paramValue}" -> using "${actualParameterName}" for render`);
            }
            
            console.log(`Template has ${templateParameters.length} parameter(s)`);
            console.log(`Parameter details:`, JSON.stringify(templateParameters, null, 2));
        } else {
            // Try to get from fullTemplate if available
            const fullTemplate = (template as any).fullTemplate;
            if (fullTemplate?.layers) {
                const layer = fullTemplate.layers[0];
                if (layer?.parametrization?.value) {
                    actualParameterName = layer.parametrization.value.toString().replace(/^#/, '');
                    console.log(`Found parameter from fullTemplate: "${actualParameterName}"`);
                }
            }
            
            if (actualParameterName === templateConfig.parameterKey) {
                console.warn(`⚠️ WARNING: Could not extract parameter name from template. Using default: "${actualParameterName}"`);
            }
        }
        
        console.log(`Using parameter name for render: "${actualParameterName}"`);

        // Wait for template to be ready (Plainly may need time to process)
        console.log(`\n[4.5/7] Waiting 30 seconds for template to be ready...`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for template to be ready
        console.log(`✅ Template should be ready now`);
        
        // Double-check template exists by trying to get project info
        console.log(`Verifying template is accessible...`);
        try {
            const { getProject } = await import('@/lib/plainly');
            const projectInfo = await getProject(projectId);
            console.log(`Project status: ${projectInfo.status || 'unknown'}`);
            console.log(`Project has ${projectInfo.templates?.length || 0} template(s)`);
        } catch (verifyError) {
            console.warn(`Could not verify project:`, verifyError);
        }

        // Step 5: Render with user's logo
        console.log(`\n[5/7] Starting render with logo...`);
        console.log(`Using projectId: ${projectId}, templateId: ${templateId}`);
        console.log(`Using parameter name: "${actualParameterName}"`);
        console.log(`Render parameters:`, { [actualParameterName]: logoImage });
        
        const render = await renderTemplate(projectId, templateId, {
            [actualParameterName]: logoImage,
        });

        console.log(`Render submitted: ${render.id}`);

        // Wait for render completion
        const result = await waitForRender(render.id, 60, 5000);

        if (!result.downloadUrl) {
            throw new Error('Render completed but no output URL returned');
        }

        console.log(`Render complete. Plainly output: ${result.downloadUrl}`);

        // Step 6: Upload output video to Cloudflare R2
        console.log(`\n[6/7] Uploading to Cloudflare R2...`);
        const videoFilename = generateUniqueFilename('mp4');
        const videoKey = `${R2_PATHS.renders}/${videoFilename}`;

        const cloudflareVideoUrl = await uploadFromUrlToR2(result.downloadUrl, videoKey);
        console.log(`Video uploaded: ${cloudflareVideoUrl}`);

        // Step 7: Wait 10 seconds before deleting the project (to ensure video is fully processed)
        console.log(`\n[7/8] Waiting 10 seconds before cleanup...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log(`✅ Wait complete`);

        // Step 8: DELETE the entire project from Plainly (including all renders)
        console.log(`\n[8/8] Deleting Plainly project: ${projectId}`);
        await deleteProject(projectId);
        console.log(`Project deleted from Plainly`);

        console.log(`\n=== RENDER COMPLETE ===\n`);

        return NextResponse.json({
            success: true,
            projectId: projectId,
            renderId: render.id,
            previewUrl: cloudflareVideoUrl,
            downloadUrl: cloudflareVideoUrl,
            videoKey: videoKey,
        });

    } catch (error) {
        console.error('\n=== RENDER ERROR ===');
        console.error(error);

        // Always cleanup the project on error
        if (projectId) {
            try {
                console.log(`Cleaning up project on error: ${projectId}`);
                await deleteProject(projectId);
            } catch (cleanupError) {
                console.error('Failed to cleanup project:', cleanupError);
            }
        }

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Render failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/render?id=xxx
 * 
 * Check render status (placeholder)
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('id');

    if (!jobId) {
        return NextResponse.json(
            { error: 'Job ID is required' },
            { status: 400 }
        );
    }

    return NextResponse.json({
        id: jobId,
        status: 'pending',
    });
}
