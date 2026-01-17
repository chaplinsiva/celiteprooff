import { NextRequest, NextResponse } from 'next/server';
import {
    createProject,
    waitForProjectReady,
    autoGenerateTemplates,
    getProjectTemplates,
} from '@/lib/plainly';
import { listR2Objects, getR2PublicUrl, R2_PATHS } from '@/lib/cloudflare-r2';
import { getDefaultLogoUrl } from '@/lib/logo-replacement';

/**
 * POST /api/auto-setup-template
 * 
 * Automatically discover templates from Cloudflare R2 and set them up in Plainly.
 * This endpoint:
 * 1. Lists all template ZIP files from R2
 * 2. For each template, creates a Plainly project
 * 3. Automatically configures logo replacement (logo will be replaced during render via parameters)
 * 
 * Request body (optional):
 * {
 *   "logoUrl": "https://...", // Optional: Your logo URL (defaults to DEFAULT_LOGO_URL env var)
 *   "templatePrefix": "templates/", // Optional: Prefix to filter templates
 *   "autoSetup": true // Optional: Automatically set up all templates (default: false, just lists)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { logoUrl, templatePrefix = R2_PATHS.templates, autoSetup = false } = body;

        console.log(`\n=== AUTO TEMPLATE SETUP START ===`);
        console.log(`Template prefix: ${templatePrefix}`);
        console.log(`Auto setup: ${autoSetup}`);

        // Step 1: List all template ZIP files from R2
        console.log(`\n[1/3] Listing templates from Cloudflare R2...`);
        const allObjects = await listR2Objects(templatePrefix);
        const templateZips = allObjects.filter(key => 
            key.toLowerCase().endsWith('.zip') && 
            key.startsWith(templatePrefix)
        );

        if (templateZips.length === 0) {
            return NextResponse.json({
                success: false,
                message: `No template ZIP files found in R2 with prefix: ${templatePrefix}`,
                templates: [],
            });
        }

        console.log(`Found ${templateZips.length} template(s):`);
        templateZips.forEach(key => console.log(`  - ${key}`));

        // Get logo URL (use provided, env var, or throw error)
        let defaultLogoUrl: string;
        try {
            defaultLogoUrl = logoUrl || getDefaultLogoUrl();
            console.log(`\nUsing logo: ${defaultLogoUrl}`);
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: 'No logo URL provided and DEFAULT_LOGO_URL/DEFAULT_LOGO_KEY not configured',
                templates: templateZips.map(key => ({
                    key,
                    url: getR2PublicUrl(key),
                    name: extractTemplateName(key),
                })),
                instructions: [
                    'Provide logoUrl in request body, or',
                    'Set DEFAULT_LOGO_URL in .env to your logo URL, or',
                    'Set DEFAULT_LOGO_KEY in .env to R2 key (e.g., "logo/default-logo.png")'
                ],
            }, { status: 400 });
        }

        // Step 2: Extract template information
        const templates = templateZips.map(key => ({
            key,
            url: getR2PublicUrl(key),
            name: extractTemplateName(key),
            slug: extractTemplateSlug(key),
        }));

        // Step 3: Auto-setup if requested
        const setupResults = [];
        if (autoSetup) {
            console.log(`\n[2/3] Auto-setting up ${templates.length} template(s)...`);
            
            for (const template of templates) {
                try {
                    console.log(`\n--- Setting up: ${template.name} ---`);
                    
                    // Create Plainly project
                    const projectName = `CelitePro-${template.slug}`;
                    console.log(`Creating project: ${projectName}`);
                    const project = await createProject(projectName, template.url);
                    console.log(`Project created: ${project.id}`);

                    // Wait for project to be ready
                    console.log(`Waiting for project analysis...`);
                    const readyProject = await waitForProjectReady(project.id, 120, 5000);
                    console.log(`Project ready: ${readyProject.status}`);

                    // Generate templates
                    console.log(`Generating templates...`);
                    let projectTemplates = await getProjectTemplates(project.id);
                    if (!projectTemplates || projectTemplates.length === 0) {
                        projectTemplates = await autoGenerateTemplates(project.id);
                    }

                    if (!projectTemplates || projectTemplates.length === 0) {
                        throw new Error('No templates generated');
                    }

                    const templateId = projectTemplates[0].id;
                    console.log(`Template ID: ${templateId}`);

                    setupResults.push({
                        template: template.name,
                        slug: template.slug,
                        success: true,
                        projectId: project.id,
                        templateId: templateId,
                        logoUrl: defaultLogoUrl,
                        envVars: `PLAINLY_PROJECT_ID_${template.slug.toUpperCase()}="${project.id}"\nPLAINLY_TEMPLATE_ID_${template.slug.toUpperCase()}="${templateId}"`,
                    });

                } catch (error) {
                    console.error(`Failed to setup ${template.name}:`, error);
                    setupResults.push({
                        template: template.name,
                        slug: template.slug,
                        success: false,
                        error: error instanceof Error ? error.message : 'Setup failed',
                    });
                }
            }

            console.log(`\n[3/3] Setup complete!`);
        } else {
            console.log(`\n[2/3] Auto-setup disabled. Set autoSetup: true to automatically set up templates.`);
        }

        return NextResponse.json({
            success: true,
            message: autoSetup 
                ? `Auto-setup completed for ${templates.length} template(s)`
                : `Found ${templates.length} template(s). Set autoSetup: true to automatically set them up.`,
            logoUrl: defaultLogoUrl,
            templates: templates.map(t => ({
                name: t.name,
                slug: t.slug,
                key: t.key,
                url: t.url,
            })),
            setupResults: autoSetup ? setupResults : undefined,
            instructions: autoSetup ? [
                '1. Copy the projectId and templateId for each template',
                '2. Add them to your .env file or template configuration',
                '3. The logo will be automatically replaced during render via Plainly parameters',
                '4. Use the logoUrl above when rendering templates'
            ] : [
                '1. Review the templates listed above',
                '2. Set autoSetup: true in the request body to automatically set them up',
                '3. Or use /api/setup-template to set up individual templates'
            ],
        });

    } catch (error) {
        console.error('\n=== AUTO TEMPLATE SETUP ERROR ===');
        console.error(error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Auto-setup failed',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/auto-setup-template
 * 
 * List templates from Cloudflare R2 without setting them up
 */
export async function GET() {
    try {
        const templates = await listR2Objects(R2_PATHS.templates);
        const templateZips = templates.filter(key => key.toLowerCase().endsWith('.zip'));

        return NextResponse.json({
            description: 'Automatically discover and set up templates from Cloudflare R2',
            foundTemplates: templateZips.length,
            templates: templateZips.map(key => ({
                key,
                name: extractTemplateName(key),
                slug: extractTemplateSlug(key),
                url: getR2PublicUrl(key),
            })),
            usage: {
                method: 'POST',
                body: {
                    logoUrl: 'https://... (optional, defaults to DEFAULT_LOGO_URL)',
                    templatePrefix: 'templates/ (optional)',
                    autoSetup: 'true (optional, set to true to automatically set up all templates)',
                },
                example: {
                    listOnly: {
                        body: {},
                    },
                    autoSetup: {
                        body: {
                            logoUrl: 'https://your-logo-url.com/logo.png',
                            autoSetup: true,
                        },
                    },
                },
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to list templates',
            },
            { status: 500 }
        );
    }
}

/**
 * Extract template name from R2 key
 * e.g., "templates/Quick Logo Reveal.zip" -> "Quick Logo Reveal"
 */
function extractTemplateName(key: string): string {
    const filename = key.split('/').pop() || key;
    return filename.replace(/\.zip$/i, '');
}

/**
 * Extract template slug from R2 key
 * e.g., "templates/Quick Logo Reveal.zip" -> "quick-logo-reveal"
 */
function extractTemplateSlug(key: string): string {
    const name = extractTemplateName(key);
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}


