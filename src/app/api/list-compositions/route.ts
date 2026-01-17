import { NextRequest, NextResponse } from 'next/server';
import { getProjectMetadata, listProjectCompositions } from '@/lib/plainly';

/**
 * GET /api/list-compositions?projectId=xxx
 * 
 * List all available compositions in a Plainly project
 * Useful for debugging and finding the correct composition name
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId query parameter is required' },
                { status: 400 }
            );
        }

        console.log(`Listing compositions for project: ${projectId}`);

        // Get full metadata
        const metadata = await getProjectMetadata(projectId);
        
        // List compositions
        const compositions = await listProjectCompositions(projectId);

        return NextResponse.json({
            success: true,
            projectId,
            compositions,
            compositionCount: compositions.length,
            metadata: {
                structure: Object.keys(metadata),
                hasCompositions: !!(metadata.compositions || metadata.data?.compositions || metadata.project?.compositions),
            },
            instructions: [
                'Use one of the composition names above when setting up your template',
                'Example: POST /api/setup-template with compositionName matching one of the names above'
            ]
        });

    } catch (error) {
        console.error('List compositions error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to list compositions',
                details: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

