'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import LogoReveal from '@/components/LogoReveal';
import Templates from '@/components/Templates';
import TemplateDetail from '@/components/TemplateDetail';
import Editor from '@/components/Editor';
import { Template } from '@/lib/supabase';

/**
 * Home Page
 * 
 * Main landing page featuring:
 * - Header navigation
 * - Hero section
 * - Quick Logo Reveal section
 * - Template gallery
 * - Template detail modal
 * - Editor modal
 */
export default function HomePage() {
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    function handleSelectTemplate(template: Template) {
        setSelectedTemplate(template);
        setIsEditing(false);
    }

    function handleEdit() {
        setIsEditing(true);
    }

    function handleCloseDetail() {
        setSelectedTemplate(null);
        setIsEditing(false);
    }

    function handleCloseEditor() {
        setIsEditing(false);
    }

    return (
        <>
            <Header />

            <main>
                <Hero />
                <LogoReveal />
                <Templates onSelectTemplate={handleSelectTemplate} />
            </main>

            {/* Template Detail Modal */}
            {selectedTemplate && !isEditing && (
                <TemplateDetail
                    template={selectedTemplate}
                    onEdit={handleEdit}
                    onClose={handleCloseDetail}
                />
            )}

            {/* Editor Modal */}
            {selectedTemplate && isEditing && (
                <Editor
                    template={selectedTemplate}
                    onClose={handleCloseEditor}
                />
            )}
        </>
    );
}
