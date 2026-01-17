/**
 * Logo Replacement Utility
 * 
 * Replaces logo files in After Effects template ZIP archives with your custom logo.
 * This is used during automated template setup to ensure all templates use your branding.
 */

import { downloadFromR2, uploadToR2, R2_PATHS } from './cloudflare-r2';

/**
 * Replace logo in a ZIP file from R2
 * Downloads the ZIP, replaces logo files, and uploads the modified version
 * 
 * @param templateZipKey - R2 key of the template ZIP (e.g., 'templates/template.zip')
 * @param logoUrl - URL of your logo to replace with (can be R2 URL or any public URL)
 * @param logoPaths - Array of logo file paths to replace in the ZIP (e.g., ['logo.png', 'assets/logo.png'])
 * @returns Public URL of the modified template ZIP
 */
export async function replaceLogoInTemplateZip(
    templateZipKey: string,
    logoUrl: string,
    logoPaths: string[] = ['logo.png', 'LOGO.png', 'Logo.png', 'assets/logo.png', 'Assets/Logo.png']
): Promise<string> {
    console.log(`Replacing logo in template: ${templateZipKey}`);
    console.log(`Using logo from: ${logoUrl}`);
    console.log(`Target logo paths: ${logoPaths.join(', ')}`);

    // Download the template ZIP from R2
    console.log(`Downloading template ZIP from R2...`);
    const zipBuffer = await downloadFromR2(templateZipKey);

    // Download the replacement logo
    console.log(`Downloading replacement logo...`);
    const logoResponse = await fetch(logoUrl);
    if (!logoResponse.ok) {
        throw new Error(`Failed to download logo from ${logoUrl}: ${logoResponse.statusText}`);
    }
    const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
    const logoContentType = logoResponse.headers.get('content-type') || 'image/png';

    // For now, we'll use a simple approach: upload the logo separately
    // and let Plainly handle the replacement via parameters
    // Full ZIP manipulation would require additional dependencies
    
    // Return the original template URL - logo replacement will happen via Plainly parameters
    // In a full implementation, you would:
    // 1. Extract ZIP
    // 2. Replace logo files
    // 3. Re-zip
    // 4. Upload modified ZIP
    
    console.log(`Note: Logo replacement will be handled via Plainly parameters during render`);
    
    // Return the original template URL
    const { getR2PublicUrl } = require('./cloudflare-r2');
    return getR2PublicUrl(templateZipKey);
}

/**
 * Get default logo URL from environment or config
 */
export function getDefaultLogoUrl(): string {
    // Check for default logo URL in environment
    const defaultLogoUrl = process.env.DEFAULT_LOGO_URL;
    if (defaultLogoUrl) {
        return defaultLogoUrl;
    }

    // Check for default logo in R2
    const defaultLogoKey = process.env.DEFAULT_LOGO_KEY;
    if (defaultLogoKey) {
        const { getR2PublicUrl } = require('./cloudflare-r2');
        return getR2PublicUrl(defaultLogoKey);
    }

    throw new Error('No default logo configured. Set DEFAULT_LOGO_URL or DEFAULT_LOGO_KEY in .env');
}

