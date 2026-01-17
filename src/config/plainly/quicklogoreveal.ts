/**
 * Quick Logo Reveal - Plainly Template Configuration
 * 
 * Template Details (from Plainly MCP):
 * - Project ID: b3bd6a27-802d-437f-8c71-c694df7ded26
 * - Template ID: c3fbd7af-c37d-45f0-836f-f6b99de99cde
 * - Aspect Ratio: 16:9
 * - Duration: ~3 seconds
 * 
 * The After Effects template is stored on Cloudflare R2:
 * - Template ZIP: templates/quicklogoreveal.zip
 */

export interface QuickLogoRevealParams {
    /** Logo image URL - PNG with transparency recommended */
    logoImage: string;
}

export const quickLogoRevealConfig = {
    // Plainly IDs (from MCP discovery)
    projectId: 'b3bd6a27-802d-437f-8c71-c694df7ded26',
    templateId: 'c3fbd7af-c37d-45f0-836f-f6b99de99cde',
    isDesign: false,

    // Template metadata
    name: 'Quick Logo Reveal',
    slug: 'quicklogoreveal',
    description: 'Fast, professional logo reveal animation with dynamic effects',
    category: 'LOGO_ANIMATION',

    // Cloudflare R2 paths
    templateZipKey: 'templates/quicklogoreveal.zip',

    // Aspect ratio
    aspectRatio: '16:9',

    // Duration in seconds
    durationSeconds: 3.04,

    // Parameter definitions matching Plainly template
    parameters: {
        logoImage: {
            key: 'lOGO', // Exact key from Plainly (case-sensitive!)
            label: 'LOGO',
            type: 'MEDIA',
            mediaType: 'image',
            required: false,
            description: 'Your logo image (PNG with transparency recommended)',
        },
    },
};

/**
 * Helper function to build parameters for Plainly render
 */
export function buildQuickLogoRevealParams(logoImageUrl: string) {
    return {
        [quickLogoRevealConfig.parameters.logoImage.key]: logoImageUrl,
    };
}

/**
 * Get the Cloudflare R2 public URL for the template ZIP
 */
export function getTemplateZipUrl(): string {
    const publicUrl = process.env.PUBLIC_URL_S3 || 'https://pub-7badf4bfca46446ea06033d70f1216c4.r2.dev';
    return `${publicUrl}/${quickLogoRevealConfig.templateZipKey}`;
}
