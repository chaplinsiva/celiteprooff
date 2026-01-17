/**
 * Plainly API Client
 * 
 * Handles video template rendering with the Plainly Videos API.
 * Supports dynamic project creation from Cloudflare R2 templates.
 */

const PLAINLY_API_KEY = process.env.PLAINLY_API_KEY || '';
const PLAINLY_API_BASE = 'https://api.plainlyvideos.com/api/v2';

interface PlainlyRenderResponse {
    id: string;
    state: 'PENDING' | 'THROTTLED' | 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'INVALID' | 'CANCELLED';
    output?: string;
    error?: string | Record<string, unknown>;
}

interface PlainlyProject {
    id: string;
    name: string;
    status?: string;
    renderReady?: boolean;
    error?: string;
    analysis?: {
        done: boolean;
        failed: boolean;
        pending: boolean;
        error?: string;
    };
    templates?: PlainlyTemplate[];
}

interface PlainlyTemplate {
    id: string;
    name: string;
    parameters?: string[];
    fullTemplate?: any;
}

/**
 * Create headers for Plainly API requests
 * Uses HTTP Basic Auth with API key as username and empty password
 */
function getHeaders() {
    if (!PLAINLY_API_KEY) {
        throw new Error('PLAINLY_API_KEY environment variable is not set');
    }
    const credentials = Buffer.from(`${PLAINLY_API_KEY}:`).toString('base64');
    return {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Create a new project in Plainly from a ZIP URL
 * Uses multipart/form-data as required by Plainly API
 * @param name - Project name
 * @param zipUrl - Public URL to the AE template ZIP file
 * @returns Project details
 */
export async function createProject(name: string, zipUrl: string): Promise<PlainlyProject> {
    console.log(`Creating Plainly project from: ${zipUrl}`);

    // Plainly requires multipart/form-data for project creation
    const formData = new FormData();
    formData.append('name', name);
    formData.append('fileUrl', zipUrl);

    // Get auth header without Content-Type (FormData sets it automatically with boundary)
    if (!PLAINLY_API_KEY) {
        throw new Error('PLAINLY_API_KEY environment variable is not set');
    }
    const credentials = Buffer.from(`${PLAINLY_API_KEY}:`).toString('base64');

    console.log(`Sending project creation request to Plainly:`);
    console.log(`- Project Name: ${name}`);
    console.log(`- Template URL: ${zipUrl}`);

    const response = await fetch(`${PLAINLY_API_BASE}/projects`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Plainly project creation failed: ${response.status} - ${errorText}`);
        throw new Error(`Failed to create Plainly project: ${response.status} - ${errorText}`);
    }

    const project = await response.json();
    console.log(`Created Plainly project: ${project.id}`);
    return project;
}

/**
 * Get project details including templates
 */
export async function getProject(projectId: string): Promise<PlainlyProject> {
    const response = await fetch(`${PLAINLY_API_BASE}/projects/${projectId}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get project: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * Get project metadata including compositions and layers
 * Required to get internal IDs for template creation
 */
export async function getProjectMetadata(projectId: string): Promise<any> {
    const response = await fetch(`${PLAINLY_API_BASE}/projects/${projectId}/meta`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get project metadata: ${response.status} - ${errorText}`);
    }

    const metadata = await response.json();
    
    // Log the full metadata structure for debugging
    console.log('Project metadata structure:', JSON.stringify(metadata, null, 2));
    
    return metadata;
}

/**
 * List all available compositions in a project
 * Useful for debugging and finding the correct composition name
 */
export async function listProjectCompositions(projectId: string): Promise<string[]> {
    const metadata = await getProjectMetadata(projectId);
    
    // Try different possible paths for compositions
    let compositions: any[] = [];
    
    if (metadata.compositions && Array.isArray(metadata.compositions)) {
        compositions = metadata.compositions;
    } else if (metadata.data?.compositions && Array.isArray(metadata.data.compositions)) {
        compositions = metadata.data.compositions;
    } else if (metadata.project?.compositions && Array.isArray(metadata.project.compositions)) {
        compositions = metadata.project.compositions;
    } else if (Array.isArray(metadata)) {
        compositions = metadata;
    }
    
    return compositions.map((comp: any) => comp.name || comp.title || String(comp)).filter(Boolean);
}

/**
 * Wait for project to finish analyzing and become render-ready
 * @param projectId - The project ID to wait for
 * @param maxAttempts - Maximum poll attempts
 * @param intervalMs - Interval between polls
 */
export async function waitForProjectReady(
    projectId: string,
    maxAttempts = 60,
    intervalMs = 3000
): Promise<PlainlyProject> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const project = await getProject(projectId);

        console.log(`Project ${projectId} check (attempt ${attempt + 1}/${maxAttempts}):`);
        console.log(`- Analysis Done: ${project.analysis?.done}`);
        console.log(`- Full Object: ${JSON.stringify(project)}`);

        // Check analysis.done field
        if (project.analysis?.done === true || project.renderReady === true) {
            return project;
        }

        if (project.analysis?.failed === true || project.error) {
            throw new Error(`Project analysis failed for ${projectId}: ${project.analysis?.error || project.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Project analysis timeout for ${projectId}`);
}

/**
 * Auto-generate templates for a project
 */
export async function autoGenerateTemplates(projectId: string): Promise<PlainlyTemplate[]> {
    console.log(`Auto-generating templates for project: ${projectId}`);

    const response = await fetch(`${PLAINLY_API_BASE}/projects/${projectId}/templates/auto-generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            allLayers: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to auto-generate templates: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * Create a manual template for Quick Logo Reveal
 * Fetches metadata, finds the composition and layer, then creates template
 * @param projectId - Plainly project ID
 * @param templateName - Name for the template
 * @param compositionName - AE composition name (e.g., "Quick Logo Sting")
 * @param logoLayerName - AE layer name (e.g., "PNG2.png")
 */
export async function createManualTemplate(
    projectId: string,
    templateName: string,
    compositionName: string = 'Quick Logo Sting',
    logoLayerName: string = 'PNG2.png'
): Promise<PlainlyTemplate> {
    console.log(`Creating manual template for project: ${projectId}`);
    console.log(`Target composition: "${compositionName}", layer: "${logoLayerName}"`);

    // Step 1: Get project metadata to find composition and layer IDs
    const metadata = await getProjectMetadata(projectId);
    console.log(`Retrieved project metadata`);

    // Try different possible paths for compositions in metadata
    let compositions: any[] = [];
    if (metadata.compositions && Array.isArray(metadata.compositions)) {
        compositions = metadata.compositions;
    } else if (metadata.data?.compositions && Array.isArray(metadata.data.compositions)) {
        compositions = metadata.data.compositions;
    } else if (metadata.project?.compositions && Array.isArray(metadata.project.compositions)) {
        compositions = metadata.project.compositions;
    } else if (Array.isArray(metadata)) {
        compositions = metadata;
    }

    if (compositions.length === 0) {
        console.error('Full metadata structure:', JSON.stringify(metadata, null, 2));
        const availableNames = await listProjectCompositions(projectId);
        throw new Error(
            `No compositions found in project metadata. ` +
            `Available compositions: ${availableNames.length > 0 ? availableNames.join(', ') : 'none found'}. ` +
            `Please check the metadata structure.`
        );
    }

    console.log(`Found ${compositions.length} composition(s): ${compositions.map((c: any) => c.name || c.title).join(', ')}`);

    // Find the target composition (try both name and title fields, case-insensitive, trim whitespace)
    const normalizedSearchName = compositionName.trim().toLowerCase();
    const composition = compositions.find((comp: any) => {
        const compName = (comp.name || comp.title || '').toString().trim();
        const normalizedCompName = compName.toLowerCase();
        
        // Log for debugging
        console.log(`Comparing: "${compName}" (normalized: "${normalizedCompName}") with "${compositionName}" (normalized: "${normalizedSearchName}")`);
        
        return normalizedCompName === normalizedSearchName || compName === compositionName;
    });

    if (!composition) {
        const availableNames = compositions.map((c: any) => {
            const name = (c.name || c.title || 'unnamed').toString().trim();
            return `"${name}"`;
        }).join(', ');
        throw new Error(
            `Composition "${compositionName}" not found in project. ` +
            `Available compositions: ${availableNames}. ` +
            `(Searched ${compositions.length} composition(s))`
        );
    }
    
    const actualCompName = composition.name || composition.title || compositionName;
    console.log(`Found composition: "${actualCompName}" (ID: ${composition.internalId || composition.id})`);

    // Find the logo layer within the composition
    // Try multiple possible metadata structures
    let layers: any[] = [];
    
    // Try different paths for layers in metadata
    if (composition.layers && Array.isArray(composition.layers)) {
        layers = composition.layers;
    } else if (composition.data?.layers && Array.isArray(composition.data.layers)) {
        layers = composition.data.layers;
    } else if (composition.children && Array.isArray(composition.children)) {
        layers = composition.children;
    } else if (composition.items && Array.isArray(composition.items)) {
        layers = composition.items;
    }

    // Log the full composition structure for debugging
    console.log(`Composition structure keys: ${Object.keys(composition).join(', ')}`);
    console.log(`Composition full structure:`, JSON.stringify(composition, null, 2));

    // Helper function to recursively find layers (including nested ones)
    // Returns layers with their depth/path information
    const getAllLayers = (layerList: any[], depth: number = 0, path: string[] = []): Array<{layer: any, depth: number, path: string[]}> => {
        const allLayers: Array<{layer: any, depth: number, path: string[]}> = [];
        for (const layer of layerList) {
            const layerName = layer.name || layer.title || layer.label || 'unnamed';
            const currentPath = [...path, layerName];
            allLayers.push({ layer, depth, path: currentPath });
            
            // Check if layer has nested layers (composition layers, precomps, etc.)
            if (layer.layers && Array.isArray(layer.layers)) {
                allLayers.push(...getAllLayers(layer.layers, depth + 1, currentPath));
            }
            if (layer.children && Array.isArray(layer.children)) {
                allLayers.push(...getAllLayers(layer.children, depth + 1, currentPath));
            }
            if (layer.items && Array.isArray(layer.items)) {
                allLayers.push(...getAllLayers(layer.items, depth + 1, currentPath));
            }
        }
        return allLayers;
    };

    const allLayersWithPath = getAllLayers(layers);
    const allLayers = allLayersWithPath.map(item => item.layer);

    if (allLayers.length === 0) {
        console.warn(`No layers found in composition "${actualCompName}". Full composition object:`, JSON.stringify(composition, null, 2));
    } else {
        console.log(`Found ${allLayers.length} total layer(s) (including nested) in composition`);
        console.log(`Layer hierarchy:`);
        allLayersWithPath.forEach(({layer, depth, path}) => {
            const name = layer.name || layer.title || layer.label || 'unnamed';
            const type = layer.type || layer.layerType || 'unknown';
            const indent = '  '.repeat(depth);
            console.log(`${indent}${name} (${type}) - Path: ${path.join(' -> ')}`);
        });
        console.log(`Top-level layers: ${layers.map((l: any) => l.name || l.title || l.label || 'unnamed').join(', ')}`);
    }

    // Find the logo layer - it's nested: Quick Logo Sting -> Logo -> PNG2.png
    // We need to find the actual PNG2.png IMAGE layer, not the Logo parent composition layer
    const normalizedLayerName = logoLayerName.trim().toLowerCase();
    
    // Helper to check if a layer is a media/image layer (not a composition)
    const isMediaLayer = (layer: any): boolean => {
        const type = (layer.type || layer.layerType || '').toLowerCase();
        const name = (layer.name || layer.title || '').toLowerCase();
        // Media layers: have mediaType, or type is MEDIA/IMAGE, or name ends with image extension
        return !!layer.mediaType || 
               type.includes('media') || 
               type.includes('image') || 
               name.endsWith('.png') || 
               name.endsWith('.jpg') || 
               name.endsWith('.jpeg') ||
               name.endsWith('.gif') ||
               name.endsWith('.webp');
    };
    
    // Helper to check if a layer matches (exact match preferred)
    const layerMatches = (layer: any, searchName: string): boolean => {
        const layerName = (layer.name || layer.title || layer.label || '').toString().trim();
        const normalizedLayer = layerName.toLowerCase();
        const normalizedSearch = searchName.toLowerCase();
        // Exact match is preferred
        return normalizedLayer === normalizedSearch || layerName === searchName;
    };
    
    // Strategy: Find ALL matching layers with their path info, then prioritize:
    // 1. Media/image layers (not composition layers)
    // 2. Deeper nested layers (actual image, not parent composition)
    const matchingLayersWithPath = allLayersWithPath.filter(({layer}) => layerMatches(layer, logoLayerName));
    
    console.log(`Found ${matchingLayersWithPath.length} layer(s) matching "${logoLayerName}":`);
    matchingLayersWithPath.forEach(({layer, depth, path}, idx: number) => {
        const name = layer.name || layer.title || layer.label;
        const type = layer.type || layer.layerType || 'unknown';
        const isMedia = isMediaLayer(layer);
        const isComposition = type.toLowerCase().includes('comp') || layer.layers || layer.children;
        console.log(`  [${idx + 1}] "${name}" (type: ${type}, isMedia: ${isMedia}, isComposition: ${isComposition}, depth: ${depth}, path: ${path.join(' -> ')}, ID: ${layer.internalId || layer.id})`);
    });
    
    // Prioritize: 
    // 1. Media layers (not composition layers) with exact match - prefer deeper nested
    // 2. Any media layer with exact match
    // 3. Deeper nested layers (actual image, not parent)
    let logoLayerWithPath = matchingLayersWithPath
        .filter(({layer}) => isMediaLayer(layer) && !layer.layers && !layer.children) // Media layer, not composition
        .sort((a, b) => b.depth - a.depth) // Deeper first
        .find(({layer}) => layerMatches(layer, logoLayerName));
    
    if (!logoLayerWithPath) {
        // Try any media layer (even if it has children, but prefer deeper)
        logoLayerWithPath = matchingLayersWithPath
            .filter(({layer}) => isMediaLayer(layer))
            .sort((a, b) => b.depth - a.depth)
            .find(({layer}) => layerMatches(layer, logoLayerName));
    }
    
    if (!logoLayerWithPath) {
        // Try any exact match, prefer deeper nested
        logoLayerWithPath = matchingLayersWithPath
            .filter(({layer}) => layerMatches(layer, logoLayerName))
            .sort((a, b) => b.depth - a.depth)[0];
    }
    
    if (!logoLayerWithPath && matchingLayersWithPath.length > 0) {
        // Last resort: use deepest matching layer
        logoLayerWithPath = matchingLayersWithPath.sort((a, b) => b.depth - a.depth)[0];
        console.warn(`⚠️ Using deepest matching layer: "${logoLayerWithPath.layer.name || logoLayerWithPath.layer.title}" (depth: ${logoLayerWithPath.depth})`);
    }
    
    let logoLayer = logoLayerWithPath?.layer;
    
    if (logoLayer && logoLayerWithPath) {
        console.log(`✅ Selected layer: "${logoLayer.name || logoLayer.title}" at depth ${logoLayerWithPath.depth}, path: ${logoLayerWithPath.path.join(' -> ')}`);
    }
    
    // If still not found, try partial match with media layer preference
    if (!logoLayer) {
        console.log(`Exact match not found, trying partial match for media layers...`);
        const partialMatch = allLayersWithPath
            .filter(({layer}) => {
                const layerName = (layer.name || layer.title || layer.label || '').toString().trim().toLowerCase();
                const matches = layerName.includes(normalizedLayerName) || normalizedLayerName.includes(layerName);
                return matches && isMediaLayer(layer) && !layer.layers && !layer.children;
            })
            .sort((a, b) => b.depth - a.depth)[0];
        
        if (partialMatch) {
            logoLayer = partialMatch.layer;
            console.log(`Found media layer by partial match: "${logoLayer.name || logoLayer.title}" at depth ${partialMatch.depth}`);
        }
    }
    
    // Last resort: find any layer with file extension
    if (!logoLayer) {
        const fileExtension = logoLayerName.split('.').pop()?.toLowerCase();
        const extensionMatch = allLayersWithPath
            .filter(({layer}) => {
                const layerName = (layer.name || layer.title || layer.label || '').toString().trim().toLowerCase();
                return layerName.endsWith(`.${fileExtension}`) && isMediaLayer(layer) && !layer.layers && !layer.children;
            })
            .sort((a, b) => b.depth - a.depth)[0];
        
        if (extensionMatch) {
            logoLayer = extensionMatch.layer;
            console.log(`Found media layer by extension match: "${logoLayer.name || logoLayer.title}" at depth ${extensionMatch.depth}`);
        }
    }
    

    if (!logoLayer) {
        const availableLayers = layers.length > 0 
            ? layers.map((l: any) => l.name || l.title || 'unnamed').join(', ')
            : 'none found';
        throw new Error(
            `Layer "${logoLayerName}" not found in composition "${actualCompName}". ` +
            `Available layers: ${availableLayers}`
        );
    }
    
    const actualLayerName = logoLayer.name || logoLayer.title || logoLayerName;
    // Try multiple possible ID fields - Plainly might use different field names
    const layerId = logoLayer.internalId || logoLayer.id || logoLayer.layerId || logoLayer.uuid;
    const layerType = logoLayer.type || logoLayer.layerType || 'MEDIA';
    
    console.log(`Layer details:`);
    console.log(`  Name: ${actualLayerName}`);
    console.log(`  ID: ${layerId}`);
    console.log(`  Type: ${layerType}`);
    console.log(`  All layer fields:`, Object.keys(logoLayer));
    console.log(`  Full layer object:`, JSON.stringify(logoLayer, null, 2));
    
    // Check if layer is in a nested composition
    const parentComposition = logoLayer.composition || logoLayer.parentComposition;
    if (parentComposition) {
        console.log(`Layer is in nested composition: ${parentComposition.name || parentComposition}`);
    }
    
    // Plainly requires lowercase mediaType: "image", "video", or "audio"
    let mediaType = logoLayer.mediaType;
    if (mediaType) {
        mediaType = mediaType.toLowerCase();
    } else {
        // Auto-detect from file extension
        const lowerName = actualLayerName.toLowerCase();
        if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif') || lowerName.endsWith('.webp')) {
            mediaType = 'image';
        } else if (lowerName.endsWith('.mp4') || lowerName.endsWith('.mov') || lowerName.endsWith('.avi')) {
            mediaType = 'video';
        } else if (lowerName.endsWith('.mp3') || lowerName.endsWith('.wav')) {
            mediaType = 'audio';
        } else {
            mediaType = 'image'; // Default to image for logo layers
        }
    }
    
    // Ensure mediaType is one of the allowed values
    if (!['image', 'video', 'audio'].includes(mediaType)) {
        mediaType = 'image'; // Default to image if invalid
    }
    
    console.log(`Found layer: "${actualLayerName}" (ID: ${layerId}, Type: ${layerType}, MediaType: ${mediaType})`);

    // Step 2: Create template with proper structure
    // Plainly API expects renderingComposition (string) and renderingCompositionId (number/Long)
    const compId = composition.internalId || composition.id || composition.compositionId;
    
    if (!compId) {
        throw new Error(`Composition ID not found. Composition object: ${JSON.stringify(composition)}`);
    }
    
    // Convert ID to number if it's a string (Plainly expects Long/number)
    const compositionIdNumber = typeof compId === 'string' ? parseInt(compId, 10) : Number(compId);
    
    if (isNaN(compositionIdNumber)) {
        throw new Error(`Invalid composition ID: ${compId}. Expected a number.`);
    }
    
    console.log(`Using composition ID: ${compositionIdNumber} (from ${compId})`);
    
    // Convert layer ID - Plainly might expect string or number, try to preserve original format
    let layerIdNumber: number | string | null = null;
    
    if (layerId) {
        // Try to convert to number first
        const numId = typeof layerId === 'string' ? parseInt(layerId, 10) : Number(layerId);
        if (!isNaN(numId)) {
            layerIdNumber = numId;
        } else {
            // If not a valid number, use as string
            layerIdNumber = String(layerId);
        }
    }
    
    if (!logoLayer) {
        throw new Error(`Layer "${logoLayerName}" not found. Cannot create template without layer parameter.`);
    }
    
    if (!layerIdNumber) {
        console.error(`Layer object:`, JSON.stringify(logoLayer, null, 2));
        throw new Error(`Invalid layer ID: ${layerId}. Cannot create template parameter. Layer object keys: ${Object.keys(logoLayer).join(', ')}`);
    }
    
    console.log(`Using layer ID: ${layerIdNumber} (type: ${typeof layerIdNumber}, original: ${layerId})`);
    
    // Plainly API expects 'layers' array, not 'parameters'
    // Each layer needs: internalId, layerName, layerType, mediaType, label, parametrization, compositions
    // To make it Dynamic, we need to set the parametrization correctly
    // IMPORTANT: The layer ID and composition references must match exactly what's in the metadata
    
    // Build compositions array - must include the rendering composition
    const layerCompositions = [
        {
            name: actualCompName, // Must match renderingComposition exactly
            id: compositionIdNumber, // Must match renderingCompositionId exactly
        }
    ];
    
    // If layer is in a nested composition, add parent composition reference
    if (parentComposition) {
        const parentCompId = parentComposition.id || parentComposition.internalId;
        if (parentCompId && parentCompId !== compositionIdNumber) {
            const parentCompIdNum = typeof parentCompId === 'string' ? parseInt(parentCompId, 10) : Number(parentCompId);
            if (!isNaN(parentCompIdNum)) {
                layerCompositions.push({
                    name: parentComposition.name || actualCompName,
                    id: parentCompIdNum,
                });
            }
        }
    }
    
    const templateDefinition: any = {
        name: templateName,
        outputFormat: 'MP4',
        renderingComposition: actualCompName, // String name (required, not blank)
        renderingCompositionId: compositionIdNumber, // Number ID (required, not null)
        layers: [
            {
                internalId: layerIdNumber, // Layer's internal ID (must match metadata exactly)
                layerName: actualLayerName, // Exact layer name from AE (must match exactly, case-sensitive)
                layerType: layerType, // Layer type from metadata
                mediaType: mediaType, // Media type (image/video/audio, lowercase)
                label: 'Logo', // Friendly display name
                parametrization: {
                    expression: true, // Enable parametrization (this makes it dynamic)
                    value: '#png2Png', // Parameter identifier (with # prefix for Plainly)
                    // Note: When rendering, use 'png2Png' (without #) in parameters
                    scaleToFit: true, // Enable autoscale
                    scaleToComposition: true,
                },
                compositions: layerCompositions, // Composition references
            }
        ]
    };
    
    console.log(`Template definition with layer:`, JSON.stringify(templateDefinition, null, 2));
    console.log(`Template will include parameter for layer "${actualLayerName}" (ID: ${layerIdNumber})`);

    console.log(`Creating template with definition:`, JSON.stringify(templateDefinition, null, 2));

    const response = await fetch(`${PLAINLY_API_BASE}/projects/${projectId}/templates`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(templateDefinition),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create manual template: ${response.status} - ${errorText}`);
    }

    const templateResponse = await response.json();
    console.log(`✅ Template creation API call successful`);
    console.log(`Full template response:`, JSON.stringify(templateResponse, null, 2));
    
    // The response might be the template object directly, or it might be wrapped
    const template = templateResponse.data || templateResponse.template || templateResponse;
    
    // Extract template ID - check multiple possible fields and locations
    let templateId = template.id || template.templateId || template.template_id || template.uuid || templateResponse.id;
    
    // If still not found, check if it's in a nested structure
    if (!templateId && templateResponse.data) {
        templateId = templateResponse.data.id || templateResponse.data.templateId;
    }
    
    // If template ID is still not found or matches project ID, query the project to get the template
    let project: PlainlyProject | null = null;
    if (!templateId || templateId === projectId) {
        console.log(`Template ID not found in creation response or matches project ID. Querying project for templates...`);
        
        // Wait a moment for template to be registered
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get project details which should include templates
        project = await getProject(projectId);
        console.log(`Project details:`, JSON.stringify(project, null, 2));
        
        if (project.templates && project.templates.length > 0) {
            // Find the template we just created (by name or most recent)
            const createdTemplate = project.templates.find((t: any) => 
                t.name === templateName || 
                t.name === `${templateName}-template` ||
                t.name?.includes(templateName)
            ) || project.templates[project.templates.length - 1]; // Fallback to most recent
            
            if (createdTemplate && createdTemplate.id && createdTemplate.id !== projectId) {
                templateId = createdTemplate.id;
                console.log(`✅ Found template ID from project query: ${templateId}`);
            } else {
                console.error(`Template found in project but ID is invalid:`, createdTemplate);
            }
        } else {
            console.warn(`No templates found in project. Project status: ${project.status || 'unknown'}`);
        }
    }
    
    if (!templateId) {
        console.error(`Template response structure:`, Object.keys(templateResponse));
        console.error(`Template object structure:`, template ? Object.keys(template) : 'null');
        throw new Error(`Template ID not found in response or project. Response keys: ${Object.keys(templateResponse).join(', ')}`);
    }
    
    // Verify template ID is not the same as project ID
    if (templateId === projectId) {
        console.error(`⚠️ ERROR: Template ID (${templateId}) still matches Project ID (${projectId}) after querying!`);
        console.error(`This suggests the template was not created successfully or the API response structure is unexpected.`);
        console.error(`Full creation response:`, JSON.stringify(templateResponse, null, 2));
        if (project) {
            console.error(`Project templates:`, project.templates);
        }
        throw new Error(`Template ID cannot be the same as Project ID. Template may not have been created successfully. Please check Plainly dashboard.`);
    }
    
    console.log(`✅ Template ID extracted: ${templateId} (Project ID: ${projectId})`);
    
    // Extract parameter names from the template response or project query
    let parameters = (template as any).parameters || (template as any).params || (template as any).layers || [];
    if (parameters.length === 0 && project?.templates) {
        const foundTemplate = project.templates.find((t: any) => t.id === templateId);
        if (foundTemplate) {
            parameters = (foundTemplate as any).parameters || (foundTemplate as any).params || (foundTemplate as any).layers || [];
        }
    }
    const parameterNames = parameters.map((p: any) => p.name || p.parameterName || p.key || p.value).filter(Boolean);
    console.log(`Template parameters: ${parameterNames.join(', ')}`);
    
    // Ensure we return the template with the correct ID format and parameter info
    return {
        id: String(templateId), // Use the extracted template ID, not project ID
        name: template.name || templateName,
        parameters: parameterNames,
        fullTemplate: template, // Include full template for debugging
    };
}

/**
 * Get templates for a project
 */
export async function getProjectTemplates(projectId: string): Promise<PlainlyTemplate[]> {
    const response = await fetch(`${PLAINLY_API_BASE}/projects/${projectId}/templates`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get templates: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * Submit a render request to Plainly
 */
export async function renderTemplate(
    projectId: string,
    templateId: string,
    parameters: Record<string, unknown>
): Promise<PlainlyRenderResponse> {
    // Ensure IDs are strings
    const normalizedProjectId = String(projectId);
    const normalizedTemplateId = String(templateId);
    
    const renderPayload = {
        projectId: normalizedProjectId,
        templateId: normalizedTemplateId,
        parameters,
    };
    
    console.log(`Submitting render request:`, JSON.stringify(renderPayload, null, 2));
    
    const response = await fetch(`${PLAINLY_API_BASE}/renders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(renderPayload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Render request failed:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            payload: renderPayload,
        });
        throw new Error(`Plainly render error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`Render request successful:`, result);
    return result;
}

/**
 * Check render status
 */
export async function checkRenderStatus(renderId: string): Promise<PlainlyRenderResponse> {
    const response = await fetch(`${PLAINLY_API_BASE}/renders/${renderId}`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Plainly status check error: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * Delete a project from Plainly (removes all templates and renders)
 */
export async function deleteProject(projectId: string): Promise<void> {
    try {
        console.log(`Deleting Plainly project: ${projectId}`);
        const response = await fetch(`${PLAINLY_API_BASE}/projects/${projectId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        if (!response.ok) {
            console.error(`Failed to delete project ${projectId}: ${response.statusText}`);
        } else {
            console.log(`Successfully deleted Plainly project: ${projectId}`);
        }
    } catch (error) {
        console.error(`Error deleting project ${projectId}:`, error);
    }
}

/**
 * Delete a render from Plainly
 */
export async function deleteRender(renderId: string): Promise<void> {
    try {
        const response = await fetch(`${PLAINLY_API_BASE}/renders/${renderId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });

        if (!response.ok) {
            console.error(`Failed to delete render ${renderId}: ${response.statusText}`);
        } else {
            console.log(`Deleted Plainly render: ${renderId}`);
        }
    } catch (error) {
        console.error(`Error deleting render ${renderId}:`, error);
    }
}

/**
 * Poll for render completion
 */
export async function waitForRender(
    renderId: string,
    maxAttempts = 60,
    intervalMs = 5000
): Promise<{ previewUrl?: string; downloadUrl?: string }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const status = await checkRenderStatus(renderId);

        console.log(`Render ${renderId} status: ${status.state} (attempt ${attempt + 1}/${maxAttempts})`);

        if (status.state === 'DONE') {
            return {
                previewUrl: status.output,
                downloadUrl: status.output,
            };
        }

        if (status.state === 'FAILED' || status.state === 'INVALID' || status.state === 'CANCELLED') {
            let errorMessage = '';
            if (status.error) {
                errorMessage = typeof status.error === 'string'
                    ? status.error
                    : JSON.stringify(status.error);
            }
            throw new Error(`Render failed with state: ${status.state}${errorMessage ? ` - ${errorMessage}` : ''}`);
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Render timeout - exceeded maximum wait time');
}
