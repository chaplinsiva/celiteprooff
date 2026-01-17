'use client';

import { Template } from '@/lib/supabase';

/**
 * TemplateDetail Component
 * 
 * Detailed template view with:
 * - Full video preview
 * - Template description
 * - Dynamic elements/placeholders list
 * - Edit button to open editor
 */
interface TemplateDetailProps {
    template: Template;
    onEdit?: () => void;
    onClose?: () => void;
}

export default function TemplateDetail({ template, onEdit, onClose }: TemplateDetailProps) {
    return (
        <div className="template-detail">
            {/* Close Button */}
            <button className="close-btn" onClick={onClose}>×</button>

            <div className="detail-content">
                {/* Preview */}
                <div className="detail-preview">
                    {template.preview_video ? (
                        <video
                            src={template.preview_video}
                            controls
                            autoPlay
                            loop
                            muted
                            playsInline
                        />
                    ) : (
                        <div className="preview-placeholder">
                            <span>▶</span>
                            <p>No preview available</p>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="detail-info">
                    <div className="info-header">
                        {template.category && (
                            <span className="template-category">{template.category}</span>
                        )}
                        <h2>{template.name}</h2>
                        {template.description && (
                            <p className="template-description">{template.description}</p>
                        )}
                    </div>

                    {/* Placeholders */}
                    {template.placeholders && template.placeholders.length > 0 && (
                        <div className="placeholders-section">
                            <h4>Customizable Elements</h4>
                            <ul className="placeholders-list">
                                {template.placeholders.map((placeholder, index) => (
                                    <li key={index} className="placeholder-item">
                                        <span className={`placeholder-icon ${placeholder.type}`}>
                                            {placeholder.type === 'text' && '✏️'}
                                            {placeholder.type === 'color' && '🎨'}
                                            {placeholder.type === 'image' && '🖼️'}
                                            {placeholder.type === 'video' && '🎬'}
                                        </span>
                                        <div className="placeholder-info">
                                            <span className="placeholder-name">{placeholder.label || placeholder.name}</span>
                                            <span className="placeholder-type">{placeholder.type}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="detail-actions">
                        <button className="btn btn-primary btn-lg" onClick={onEdit}>
                            Customize Template
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .template-detail {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          overflow-y: auto;
          animation: fadeIn 0.3s ease;
        }

        .close-btn {
          position: fixed;
          top: var(--space-lg);
          right: var(--space-lg);
          width: 48px;
          height: 48px;
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: 50%;
          font-size: 1.5rem;
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          z-index: 10;
        }

        .close-btn:hover {
          background: var(--bg-card-hover);
          transform: scale(1.1);
        }

        .detail-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-3xl) var(--space-lg);
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: var(--space-2xl);
        }

        .detail-preview {
          aspect-ratio: 16 / 9;
          background: var(--bg-tertiary);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .detail-preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: var(--space-md);
          color: var(--text-muted);
        }

        .preview-placeholder span {
          font-size: 4rem;
        }

        .detail-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-xl);
        }

        .template-category {
          display: inline-block;
          padding: var(--space-xs) var(--space-sm);
          background: var(--accent-primary);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--space-sm);
        }

        .info-header h2 {
          margin-bottom: var(--space-sm);
        }

        .template-description {
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .placeholders-section h4 {
          margin-bottom: var(--space-md);
          color: var(--text-secondary);
        }

        .placeholders-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .placeholder-item {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
        }

        .placeholder-icon {
          font-size: 1.25rem;
        }

        .placeholder-info {
          display: flex;
          flex-direction: column;
        }

        .placeholder-name {
          font-weight: 500;
        }

        .placeholder-type {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        .detail-actions {
          margin-top: auto;
        }

        .btn-lg {
          width: 100%;
          padding: var(--space-lg);
        }

        @media (max-width: 968px) {
          .detail-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}
