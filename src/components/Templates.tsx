'use client';

import { useState, useEffect } from 'react';
import { Template, getTemplates } from '@/lib/supabase';
import TemplateCard from './TemplateCard';

/**
 * Templates Component
 * 
 * Template gallery page with:
 * - Grid layout of template cards
 * - Category filtering
 * - Search functionality
 * - Loading states
 */
interface TemplatesProps {
    onSelectTemplate?: (template: Template) => void;
}

export default function Templates({ onSelectTemplate }: TemplatesProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        try {
            const data = await getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    }

    // Get unique categories
    const categories = Array.from(
        new Set(templates.map(t => t.category).filter(Boolean))
    ) as string[];

    // Filter templates
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || template.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <section className="templates-section">
            <div className="container">
                {/* Header */}
                <div className="templates-header">
                    <h2>Browse Templates</h2>
                    <p>Choose from our collection of premium video templates</p>
                </div>

                {/* Filters */}
                <div className="templates-filters">
                    {/* Search */}
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Categories */}
                    <div className="category-filters">
                        <button
                            className={`filter-btn ${!selectedCategory ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(null)}
                        >
                            All
                        </button>
                        {categories.map(category => (
                            <button
                                key={category}
                                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="templates-grid">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton-card">
                                <div className="skeleton skeleton-preview"></div>
                                <div className="skeleton-info">
                                    <div className="skeleton skeleton-title"></div>
                                    <div className="skeleton skeleton-category"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredTemplates.length > 0 ? (
                    <div className="templates-grid">
                        {filteredTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onClick={() => onSelectTemplate?.(template)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No templates found</p>
                    </div>
                )}
            </div>

            <style jsx>{`
        .templates-section {
          padding: var(--space-3xl) 0;
        }

        .templates-header {
          text-align: center;
          margin-bottom: var(--space-2xl);
        }

        .templates-header h2 {
          margin-bottom: var(--space-sm);
        }

        .templates-header p {
          color: var(--text-secondary);
        }

        .templates-filters {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          margin-bottom: var(--space-2xl);
        }

        .search-box {
          position: relative;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: var(--space-md);
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
        }

        .search-box input {
          padding-left: calc(var(--space-md) * 3);
        }

        .category-filters {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }

        .filter-btn {
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .filter-btn:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .filter-btn.active {
          background: var(--accent-gradient);
          border-color: transparent;
          color: white;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-xl);
        }

        .skeleton-card {
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .skeleton-preview {
          aspect-ratio: 16 / 9;
        }

        .skeleton-info {
          padding: var(--space-md);
        }

        .skeleton-title {
          height: 20px;
          width: 60%;
          margin-bottom: var(--space-sm);
          border-radius: var(--radius-sm);
        }

        .skeleton-category {
          height: 14px;
          width: 30%;
          border-radius: var(--radius-sm);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-3xl);
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .templates-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </section>
    );
}
