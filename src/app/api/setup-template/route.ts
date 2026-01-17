import { NextRequest, NextResponse } from 'next/server';
import {
    createProject,
    waitForProjectReady,
    autoGenerateTemplates,
    getProjectTemplates,
    createManualTemplate,
    listProjectCompositions,
} from '@/lib/plainly';
import { getR2PublicUrl } from '@/lib/cloudflare-r2';

/**
 * POST /api/setup-template
 * 
 * One-time setup to create a Plainly project from your R2 template.
 * Run this ONCE per template, then save the returned IDs to .env
 * 
 * Request body:
 * {
 *   "templateName": "Quick Logo Sting",
 *   "zipPath": "templates/Quick Logo Reveal.zip",
 *   "compositionName": "Rendering composition", // Optional: defaults to "Rendering composition"
 *   "logoLayerName": "PNG2.png", // Optional: defaults to "PNG2.png"
 *   "useManualTemplate": true // Optional: defaults to true (creates manual template with autoscale)
 * }
 * 
 * Response:
 * {
 *   "projectId": "xxx",
 *   "templateId": "yyy",
 *   "envVars": "PLAINLY_PROJECT_ID=xxx\nPLAINLY_TEMPLATE_ID=yyy"
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            templateName, 
            zipPath, 
            compositionName = 'Quick Logo Sting',
            logoLayerName = 'PNG2.png', // Image layer name
            useManualTemplate = true 
        } = body;

        if (!templateName || !zipPath) {
            return NextResponse.json(
                { error: 'templateName and zipPath are required' },
                { status: 400 }
            );
        }

        console.log(`\n=== TEMPLATE SETUP START ===`);
        console.log(`Template: ${templateName}`);
        console.log(`ZIP Path: ${zipPath}`);

        // Step 1: Get template ZIP URL from Cloudflare R2
        const templateZipUrl = getR2PublicUrl(zipPath);
        console.log(`\n[1/4] Template ZIP URL: ${templateZipUrl}`);

        // Step 2: Create project in Plainly
        const projectName = `CelitePro-${templateName.replace(/\s+/g, '-')}`;
        console.log(`\n[2/4] Creating Plainly project: ${projectName}`);

        const project = await createProject(projectName, templateZipUrl);
        console.log(`Project created: ${project.id}`);

        // Step 3: Wait for project analysis (this can take 1-3 minutes)
        console.log(`\n[3/4] Waiting for project analysis (this may take a few minutes)...`);
        const readyProject = await waitForProjectReady(project.id, 120, 5000); // 10 min max, check every 5s
        console.log(`Project is ready! Status: ${readyProject.status}`);

        // Step 4: Create template (manual or auto-generate)
        console.log(`\n[4/4] Creating template...`);
        let template;

        if (useManualTemplate) {
            // Create manual template with specific composition and layer (with autoscale)
            console.log(`Creating manual template with composition "${compositionName}" and layer "${logoLayerName}" (autoscale enabled)...`);
            try {
                template = await createManualTemplate(
                    project.id,
                    `${templateName}-template`,
                    compositionName,
                    logoLayerName
                );
                console.log(`✅ Manual template created with autoscale`);
            } catch (templateError) {
                // If composition not found, list available compositions for helpful error
                if (templateError instanceof Error && templateError.message.includes('not found')) {
                    try {
                        const availableCompositions = await listProjectCompositions(project.id);
                        throw new Error(
                            `${templateError.message}\n\n` +
                            `Available compositions in this project:\n` +
                            `- ${availableCompositions.join('\n- ')}\n\n` +
                            `Tip: Use GET /api/list-compositions?projectId=${project.id} to see all available compositions and layers.`
                        );
                    } catch (listError) {
                        // If listing fails, just throw the original error
                        throw templateError;
                    }
                }
                throw templateError;
            }
        } else {
            // Auto-generate templates
            let templates = await getProjectTemplates(project.id);

            if (!templates || templates.length === 0) {
                console.log(`No templates found, auto-generating...`);
                templates = await autoGenerateTemplates(project.id);
            }

            if (!templates || templates.length === 0) {
                throw new Error('No templates generated. Check your After Effects project structure.');
            }

            template = templates[0];
        }
        console.log(`\n=== TEMPLATE SETUP COMPLETE ===`);
        console.log(`Project ID: ${project.id}`);
        console.log(`Template ID: ${template.id}`);
        console.log(`Template Name: ${template.name}`);

        // Generate .env variables for easy copy-paste
        const envVars = `PLAINLY_PROJECT_ID="${project.id}"\nPLAINLY_TEMPLATE_ID="${template.id}"`;

        return NextResponse.json({
            success: true,
            projectId: project.id,
            projectName: projectName,
            templateId: template.id,
            templateName: template.name,
            compositionName: compositionName,
            logoLayerName: logoLayerName,
            autoscale: useManualTemplate ? true : undefined,
            envVars: envVars,
            instructions: [
                '1. Copy the projectId and templateId above',
                '2. Add them to your .env file:',
                `   PLAINLY_PROJECT_ID="${project.id}"`,
                `   PLAINLY_TEMPLATE_ID="${template.id}"`,
                '3. Restart your dev server',
                '4. Now /api/render will use this project for fast rendering!',
                useManualTemplate ? `5. Template uses composition "${compositionName}" with layer "${logoLayerName}" (autoscale enabled)` : ''
            ]
        });

    } catch (error) {
        console.error('\n=== TEMPLATE SETUP ERROR ===');
        console.error(error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Setup failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/setup-template
 * 
 * Show usage instructions
 */
export async function GET() {
    return NextResponse.json({
        description: 'One-time setup to create a Plainly project from your R2 template',
        usage: {
            method: 'POST',
            body: {
                templateName: 'Quick Logo Sting',
                zipPath: 'templates/Quick Logo Reveal.zip',
                compositionName: 'Quick Logo Sting', // Optional: defaults to "Quick Logo Sting"
                logoLayerName: 'Logo', // Optional: defaults to "Logo" (parent layer containing the image)
                useManualTemplate: true // Optional: defaults to true (creates manual template with autoscale)
            }
        },
        note: 'This creates a PERMANENT project in Plainly. Run once per template, then save the IDs to .env. Manual template creation enables autoscale for the logo layer.',
        tip: 'If you get a "composition not found" error, first create the project, then use GET /api/list-compositions?projectId=xxx to see available composition names.',
        quickSetup: {
            curl: `curl -X POST http://localhost:3000/api/setup-template -H "Content-Type: application/json" -d '{"templateName": "Quick Logo Sting", "zipPath": "templates/Quick Logo Reveal.zip", "compositionName": "Quick Logo Sting", "logoLayerName": "Logo", "useManualTemplate": true}'`
        }
    });
}
