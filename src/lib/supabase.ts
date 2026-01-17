import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbcwjpadvizbpvvtoqdv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
    console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Database operations will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Template {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    preview_video: string | null;
    zip_path: string;
    placeholders: Placeholder[];
    created_at: string;
}

export interface Placeholder {
    name: string;
    type: 'text' | 'color' | 'image' | 'video';
    default_value?: string;
    label?: string;
}

export interface RenderJob {
    id: string;
    template_id: string;
    plainly_render_id: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    parameters: Record<string, unknown>;
    preview_url: string | null;
    download_url: string | null;
    created_at: string;
    completed_at: string | null;
}

// Database functions
export async function getTemplates() {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Template[];
}

export async function getTemplateBySlug(slug: string) {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) throw error;
    return data as Template;
}

export async function createRenderJob(templateId: string, parameters: Record<string, unknown>) {
    const { data, error } = await supabase
        .from('render_jobs')
        .insert({ template_id: templateId, parameters })
        .select()
        .single();

    if (error) throw error;
    return data as RenderJob;
}

export async function updateRenderJob(id: string, updates: Partial<RenderJob>) {
    const { data, error } = await supabase
        .from('render_jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as RenderJob;
}
