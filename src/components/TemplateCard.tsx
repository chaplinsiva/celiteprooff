'use client';

import { Template } from '@/lib/supabase';

/**
 * TemplateCard Component
 * 
 * Displays a single template in the gallery grid.
 * Features:
 * - Video preview on hover
 * - Template name and category
 * - Smooth hover animations
 */
interface TemplateCardProps {
    template: Template;
    onClick?: () => void;
}

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
    return (
        <article className="template-card" onClick={onClick}>
            {/* Preview */}
            <div className="card-preview">
                {template.preview_video ? (
                    <video
                        src={template.preview_video}
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                        }}
                    />
                ) : (
                    <div className="preview-placeholder">
                        <span>▶</span>
                    </div>
                )}
                <div className="card-overlay">
                    <button className="btn btn-primary">Customize</button>
                </div>
            </div>

            {/* Info */}
            <div className="card-info">
                <h3 className="card-title">{template.name}</h3>
                {template.category && (
                    <span className="card-category">{template.category}</span>
                )}
            </div>

            <style jsx>{`
        .template-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-xl);
          overflow: hidden;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .template-card:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
        }

        .card-preview {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .card-preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 3rem;
          color: var(--text-muted);
        }

        .card-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .template-card:hover .card-overlay {
          opacity: 1;
        }

        .card-info {
          padding: var(--space-md);
        }

        .card-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: var(--space-xs);
          color: var(--text-primary);
        }

        .card-category {
          font-size: 0.75rem;
          color: var(--accent-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
        </article>
    );
}
