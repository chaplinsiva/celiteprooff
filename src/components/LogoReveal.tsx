'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * LogoReveal Component
 * 
 * A premium UI for quick logo reveal video generation:
 * - Drag & drop logo upload
 * - Real-time upload progress
 * - Animated render progress
 * - Video preview and download
 */

interface RenderState {
    status: 'idle' | 'uploading' | 'rendering' | 'completed' | 'error';
    progress: number;
    message: string;
    videoUrl?: string;
    error?: string;
}

export default function LogoReveal() {
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [renderState, setRenderState] = useState<RenderState>({
        status: 'idle',
        progress: 0,
        message: '',
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    // Handle file selection
    const handleFileSelect = useCallback(async (file: File) => {
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setRenderState({
                status: 'error',
                progress: 0,
                message: '',
                error: 'Please upload a PNG, JPEG, GIF, or WebP image.',
            });
            return;
        }

        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);
        setLogoUrl(null);

        // Upload to storage
        setRenderState({
            status: 'uploading',
            progress: 20,
            message: 'Uploading your logo...',
        });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await response.json();
            setLogoUrl(data.url);

            setRenderState({
                status: 'idle',
                progress: 0,
                message: 'Logo uploaded! Click "Create Video" to generate.',
            });
        } catch (error) {
            setRenderState({
                status: 'error',
                progress: 0,
                message: '',
                error: error instanceof Error ? error.message : 'Upload failed',
            });
        }
    }, []);

    // Drag events
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === dropZoneRef.current) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    // Handle file input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    // Render video
    const handleRender = async () => {
        if (!logoUrl) {
            setRenderState({
                status: 'error',
                progress: 0,
                message: '',
                error: 'Please upload a logo first.',
            });
            return;
        }

        setRenderState({
            status: 'rendering',
            progress: 10,
            message: 'Starting render...',
        });

        // Simulate progress while waiting
        const progressInterval = setInterval(() => {
            setRenderState(prev => ({
                ...prev,
                progress: Math.min(prev.progress + 5, 85),
                message: prev.progress < 30 ? 'Initializing...' :
                    prev.progress < 50 ? 'Processing your logo...' :
                        prev.progress < 70 ? 'Creating animation...' :
                            'Almost done...',
            }));
        }, 2000);

        try {
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateSlug: 'quicklogoreveal',
                    parameters: {
                        logoImage: logoUrl,
                    },
                }),
            });

            clearInterval(progressInterval);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Render failed');
            }

            setRenderState({
                status: 'completed',
                progress: 100,
                message: 'Your video is ready!',
                videoUrl: data.downloadUrl,
            });
        } catch (error) {
            clearInterval(progressInterval);
            setRenderState({
                status: 'error',
                progress: 0,
                message: '',
                error: error instanceof Error ? error.message : 'Render failed',
            });
        }
    };

    // Reset
    const handleReset = () => {
        setLogoPreview(null);
        setLogoUrl(null);
        setRenderState({
            status: 'idle',
            progress: 0,
            message: '',
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <section className="logo-reveal-section">
            <div className="container">
                <div className="section-header">
                    <span className="badge">✨ Quick Logo Reveal</span>
                    <h2>Create Stunning Logo Animation</h2>
                    <p>Upload your logo and get a professional reveal video in seconds</p>
                </div>

                <div className="logo-reveal-card">
                    <div className="card-content">
                        {/* Upload Zone */}
                        <div className="upload-side">
                            <div
                                ref={dropZoneRef}
                                className={`drop-zone ${isDragging ? 'dragging' : ''} ${logoPreview ? 'has-logo' : ''}`}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {logoPreview ? (
                                    <div className="logo-preview">
                                        <img src={logoPreview} alt="Your logo" />
                                        <button className="change-btn" onClick={(e) => {
                                            e.stopPropagation();
                                            handleReset();
                                        }}>
                                            Change Logo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="upload-prompt">
                                        <div className="upload-icon">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                        </div>
                                        <h4>Drop your logo here</h4>
                                        <p>or click to browse</p>
                                        <span className="file-types">PNG, JPEG, GIF, WebP (Max 5MB)</span>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/gif,image/webp"
                                    onChange={handleInputChange}
                                    hidden
                                />
                            </div>
                        </div>

                        {/* Result Side */}
                        <div className="result-side">
                            {renderState.status === 'completed' && renderState.videoUrl ? (
                                <div className="video-result">
                                    <video
                                        src={renderState.videoUrl}
                                        controls
                                        autoPlay
                                        loop
                                        playsInline
                                    />
                                    <div className="result-actions">
                                        <a
                                            href={renderState.videoUrl}
                                            download="logo-reveal.mp4"
                                            className="btn btn-primary"
                                        >
                                            ⬇️ Download Video
                                        </a>
                                        <button className="btn btn-secondary" onClick={handleReset}>
                                            🔄 Create Another
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="render-panel">
                                    <div className="preview-placeholder">
                                        <div className="placeholder-icon">🎬</div>
                                        <p>Your video will appear here</p>
                                    </div>

                                    {/* Status Messages */}
                                    {renderState.status === 'uploading' && (
                                        <div className="status-message uploading">
                                            <div className="spinner"></div>
                                            <span>{renderState.message}</span>
                                        </div>
                                    )}

                                    {renderState.status === 'rendering' && (
                                        <div className="render-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${renderState.progress}%` }}
                                                />
                                            </div>
                                            <span className="progress-text">{renderState.message}</span>
                                        </div>
                                    )}

                                    {renderState.status === 'error' && (
                                        <div className="error-message">
                                            ⚠️ {renderState.error}
                                        </div>
                                    )}

                                    {renderState.status === 'idle' && logoUrl && (
                                        <div className="ready-message">
                                            ✅ Logo ready! Click the button below to create your video.
                                        </div>
                                    )}

                                    {/* Render Button */}
                                    <button
                                        className="btn btn-primary btn-render"
                                        onClick={handleRender}
                                        disabled={!logoUrl || renderState.status === 'rendering' || renderState.status === 'uploading'}
                                    >
                                        {renderState.status === 'rendering' ? (
                                            <>
                                                <span className="spinner-small"></span>
                                                Creating Video...
                                            </>
                                        ) : (
                                            '🚀 Create Video'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .logo-reveal-section {
                    padding: var(--space-3xl) 0;
                    background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 var(--space-lg);
                }

                .section-header {
                    text-align: center;
                    margin-bottom: var(--space-2xl);
                }

                .badge {
                    display: inline-block;
                    padding: var(--space-xs) var(--space-md);
                    background: var(--accent-gradient);
                    border-radius: var(--radius-full);
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: var(--space-md);
                }

                .section-header h2 {
                    font-size: 2.5rem;
                    margin-bottom: var(--space-sm);
                    background: var(--accent-gradient);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .section-header p {
                    color: var(--text-secondary);
                    font-size: 1.125rem;
                }

                .logo-reveal-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .card-content {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    min-height: 500px;
                }

                .upload-side {
                    padding: var(--space-xl);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-right: 1px solid var(--border-primary);
                }

                .drop-zone {
                    width: 100%;
                    height: 100%;
                    min-height: 350px;
                    border: 2px dashed var(--border-secondary);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all var(--transition-normal);
                    background: var(--bg-tertiary);
                }

                .drop-zone:hover,
                .drop-zone.dragging {
                    border-color: var(--accent-primary);
                    background: rgba(99, 102, 241, 0.05);
                }

                .drop-zone.dragging {
                    transform: scale(1.02);
                }

                .upload-prompt {
                    text-align: center;
                    color: var(--text-secondary);
                }

                .upload-icon {
                    width: 80px;
                    height: 80px;
                    background: var(--accent-gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto var(--space-lg);
                    color: white;
                }

                .upload-prompt h4 {
                    color: var(--text-primary);
                    margin-bottom: var(--space-xs);
                }

                .upload-prompt p {
                    font-size: 0.875rem;
                    margin-bottom: var(--space-md);
                }

                .file-types {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }

                .logo-preview {
                    text-align: center;
                }

                .logo-preview img {
                    max-width: 200px;
                    max-height: 200px;
                    object-fit: contain;
                    margin-bottom: var(--space-lg);
                    border-radius: var(--radius-md);
                    background: white;
                    padding: var(--space-md);
                }

                .change-btn {
                    padding: var(--space-sm) var(--space-lg);
                    background: var(--bg-card);
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .change-btn:hover {
                    background: var(--bg-card-hover);
                }

                .result-side {
                    padding: var(--space-xl);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-secondary);
                }

                .render-panel {
                    width: 100%;
                    text-align: center;
                }

                .preview-placeholder {
                    aspect-ratio: 16 / 9;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-lg);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: var(--space-xl);
                    color: var(--text-muted);
                }

                .placeholder-icon {
                    font-size: 4rem;
                    margin-bottom: var(--space-md);
                }

                .status-message {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-md);
                    padding: var(--space-md);
                    background: rgba(99, 102, 241, 0.1);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-lg);
                    color: var(--accent-primary);
                }

                .render-progress {
                    margin-bottom: var(--space-lg);
                }

                .progress-bar {
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-full);
                    overflow: hidden;
                    margin-bottom: var(--space-sm);
                }

                .progress-fill {
                    height: 100%;
                    background: var(--accent-gradient);
                    border-radius: var(--radius-full);
                    transition: width 0.5s ease;
                }

                .progress-text {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .error-message {
                    padding: var(--space-md);
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #ef4444;
                    border-radius: var(--radius-md);
                    color: #ef4444;
                    margin-bottom: var(--space-lg);
                }

                .ready-message {
                    padding: var(--space-md);
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid #22c55e;
                    border-radius: var(--radius-md);
                    color: #22c55e;
                    margin-bottom: var(--space-lg);
                }

                .btn-render {
                    width: 100%;
                    padding: var(--space-lg);
                    font-size: 1.125rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-sm);
                }

                .btn-render:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .video-result {
                    width: 100%;
                }

                .video-result video {
                    width: 100%;
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--space-xl);
                }

                .result-actions {
                    display: flex;
                    gap: var(--space-md);
                    justify-content: center;
                }

                .spinner,
                .spinner-small {
                    width: 20px;
                    height: 20px;
                    border: 2px solid transparent;
                    border-top-color: currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .spinner {
                    width: 24px;
                    height: 24px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .card-content {
                        grid-template-columns: 1fr;
                    }

                    .upload-side {
                        border-right: none;
                        border-bottom: 1px solid var(--border-primary);
                    }

                    .drop-zone {
                        min-height: 250px;
                    }

                    .section-header h2 {
                        font-size: 1.75rem;
                    }
                }
            `}</style>
        </section>
    );
}
