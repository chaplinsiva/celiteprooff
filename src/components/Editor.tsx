'use client';

import { useState } from 'react';
import { Template, Placeholder } from '@/lib/supabase';

/**
 * Editor Component
 * 
 * Template editor with Plainly integration:
 * - Text placeholder editing
 * - Color picker for dynamic colors
 * - Live preview panel
 * - Render button with progress indicator
 */
interface EditorProps {
    template: Template;
    onClose?: () => void;
}

interface EditorState {
    values: Record<string, string>;
    isRendering: boolean;
    renderProgress: number;
    renderResult: {
        previewUrl?: string;
        downloadUrl?: string;
    } | null;
    error: string | null;
}

export default function Editor({ template, onClose }: EditorProps) {
    const [state, setState] = useState<EditorState>({
        values: getInitialValues(template.placeholders),
        isRendering: false,
        renderProgress: 0,
        renderResult: null,
        error: null,
    });

    function getInitialValues(placeholders: Placeholder[]): Record<string, string> {
        const values: Record<string, string> = {};
        placeholders.forEach(p => {
            values[p.name] = p.default_value || '';
        });
        return values;
    }

    function handleValueChange(name: string, value: string) {
        setState(prev => ({
            ...prev,
            values: { ...prev.values, [name]: value },
        }));
    }

    async function handleRender() {
        setState(prev => ({ ...prev, isRendering: true, renderProgress: 0, error: null }));

        try {
            // Simulate progress for demo
            const progressInterval = setInterval(() => {
                setState(prev => ({
                    ...prev,
                    renderProgress: Math.min(prev.renderProgress + 10, 90),
                }));
            }, 1000);

            // Call render API
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId: template.id,
                    parameters: state.values,
                }),
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error('Render failed');
            }

            const result = await response.json();

            setState(prev => ({
                ...prev,
                isRendering: false,
                renderProgress: 100,
                renderResult: result,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isRendering: false,
                error: error instanceof Error ? error.message : 'Render failed',
            }));
        }
    }

    return (
        <div className="editor">
            {/* Close Button */}
            <button className="close-btn" onClick={onClose}>×</button>

            <div className="editor-layout">
                {/* Preview Panel */}
                <div className="editor-preview">
                    <div className="preview-container">
                        {template.preview_video ? (
                            <video
                                src={template.preview_video}
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        ) : (
                            <div className="preview-placeholder">
                                <span>▶</span>
                            </div>
                        )}
                    </div>

                    {/* Render Result */}
                    {state.renderResult && (
                        <div className="render-result">
                            <h4>✅ Render Complete!</h4>
                            <div className="result-actions">
                                {state.renderResult.previewUrl && (
                                    <a
                                        href={state.renderResult.previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary"
                                    >
                                        Preview Video
                                    </a>
                                )}
                                {state.renderResult.downloadUrl && (
                                    <a
                                        href={state.renderResult.downloadUrl}
                                        download
                                        className="btn btn-primary"
                                    >
                                        Download
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls Panel */}
                <div className="editor-controls">
                    <div className="controls-header">
                        <h3>{template.name}</h3>
                        <p>Customize your template</p>
                    </div>

                    {/* Form Fields */}
                    <div className="controls-form">
                        {template.placeholders.map((placeholder) => (
                            <div key={placeholder.name} className="form-field">
                                <label>{placeholder.label || placeholder.name}</label>

                                {placeholder.type === 'text' && (
                                    <input
                                        type="text"
                                        value={state.values[placeholder.name] || ''}
                                        onChange={(e) => handleValueChange(placeholder.name, e.target.value)}
                                        placeholder={`Enter ${placeholder.label || placeholder.name}`}
                                    />
                                )}

                                {placeholder.type === 'color' && (
                                    <div className="color-input">
                                        <input
                                            type="color"
                                            value={state.values[placeholder.name] || '#6366f1'}
                                            onChange={(e) => handleValueChange(placeholder.name, e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            value={state.values[placeholder.name] || '#6366f1'}
                                            onChange={(e) => handleValueChange(placeholder.name, e.target.value)}
                                            pattern="^#[0-9A-Fa-f]{6}$"
                                        />
                                    </div>
                                )}

                                {placeholder.type === 'image' && (
                                    <div className="file-input">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // For demo - would upload to storage
                                                    handleValueChange(placeholder.name, URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Error Message */}
                    {state.error && (
                        <div className="error-message">
                            ⚠️ {state.error}
                        </div>
                    )}

                    {/* Render Button */}
                    <div className="controls-actions">
                        {state.isRendering ? (
                            <div className="render-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${state.renderProgress}%` }}
                                    ></div>
                                </div>
                                <span>Rendering... {state.renderProgress}%</span>
                            </div>
                        ) : (
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleRender}
                                disabled={state.isRendering}
                            >
                                🎬 Render Video
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
        .editor {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: var(--bg-primary);
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

        .editor-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          min-height: 100vh;
        }

        .editor-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-2xl);
          gap: var(--space-xl);
        }

        .preview-container {
          width: 100%;
          max-width: 800px;
          aspect-ratio: 16 / 9;
          background: var(--bg-tertiary);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .preview-container video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 4rem;
          color: var(--text-muted);
        }

        .render-result {
          background: var(--bg-card);
          border: 1px solid #22c55e;
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          text-align: center;
        }

        .render-result h4 {
          margin-bottom: var(--space-md);
          color: #22c55e;
        }

        .result-actions {
          display: flex;
          gap: var(--space-md);
          justify-content: center;
        }

        .editor-controls {
          background: var(--bg-secondary);
          border-left: 1px solid var(--border-primary);
          padding: var(--space-2xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-xl);
        }

        .controls-header h3 {
          margin-bottom: var(--space-xs);
        }

        .controls-header p {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .controls-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
          flex: 1;
          overflow-y: auto;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .color-input {
          display: flex;
          gap: var(--space-sm);
        }

        .color-input input[type="color"] {
          width: 50px;
          height: 44px;
          padding: 4px;
          cursor: pointer;
        }

        .color-input input[type="text"] {
          flex: 1;
        }

        .file-input input {
          padding: var(--space-md);
        }

        .error-message {
          padding: var(--space-md);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: var(--radius-md);
          color: #ef4444;
          font-size: 0.875rem;
        }

        .controls-actions {
          margin-top: auto;
        }

        .btn-lg {
          width: 100%;
          padding: var(--space-lg);
        }

        .render-progress {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          text-align: center;
        }

        .progress-bar {
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-gradient);
          transition: width 0.3s ease;
        }

        .render-progress span {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        @media (max-width: 968px) {
          .editor-layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
          }

          .editor-controls {
            border-left: none;
            border-top: 1px solid var(--border-primary);
          }
        }
      `}</style>
        </div>
    );
}
