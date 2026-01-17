'use client';

/**
 * Hero Component
 * 
 * Landing page hero section with:
 * - Animated gradient background
 * - Main headline with gradient text
 * - Tagline and CTA buttons
 * - Feature highlights
 */
export default function Hero() {
    const features = [
        { icon: '⚡', label: 'Fast Rendering' },
        { icon: '🎨', label: 'Easy Customization' },
        { icon: '📦', label: 'Instant Download' },
    ];

    return (
        <section className="hero">
            {/* Animated Background */}
            <div className="hero-bg">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <div className="hero-content">
                {/* Badge */}
                <div className="hero-badge">
                    <span className="badge-dot"></span>
                    Professional Video Templates
                </div>

                {/* Headline */}
                <h1 className="hero-title">
                    Create Stunning Videos
                    <br />
                    <span className="gradient-text">In Minutes</span>
                </h1>

                {/* Tagline */}
                <p className="hero-tagline">
                    Choose from our premium collection of video templates.
                    Customize text, colors, and media. Download in minutes.
                </p>

                {/* CTA Buttons */}
                <div className="hero-actions">
                    <button className="btn btn-primary btn-lg">
                        Browse Templates
                    </button>
                    <button className="btn btn-secondary btn-lg">
                        How It Works
                    </button>
                </div>

                {/* Features */}
                <div className="hero-features">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-item">
                            <span className="feature-icon">{feature.icon}</span>
                            <span className="feature-label">{feature.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 120px var(--space-lg) var(--space-3xl);
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.5;
          animation: float 20s ease-in-out infinite;
        }

        .orb-1 {
          width: 600px;
          height: 600px;
          background: var(--accent-primary);
          top: -200px;
          left: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 400px;
          height: 400px;
          background: var(--accent-secondary);
          bottom: -100px;
          right: -100px;
          animation-delay: -5s;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: #a855f7;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, -50px) scale(1.1); }
          50% { transform: translate(-30px, 30px) scale(0.95); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }

        .hero-content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 800px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: var(--space-xl);
          animation: slideUp 0.5s ease forwards;
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .hero-title {
          font-size: clamp(2.5rem, 8vw, 4.5rem);
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: var(--space-lg);
          animation: slideUp 0.5s ease 0.1s forwards;
          opacity: 0;
        }

        .hero-tagline {
          font-size: 1.25rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto var(--space-2xl);
          line-height: 1.6;
          animation: slideUp 0.5s ease 0.2s forwards;
          opacity: 0;
        }

        .hero-actions {
          display: flex;
          gap: var(--space-md);
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: var(--space-3xl);
          animation: slideUp 0.5s ease 0.3s forwards;
          opacity: 0;
        }

        .btn-lg {
          padding: var(--space-lg) var(--space-2xl);
          font-size: 1rem;
        }

        .hero-features {
          display: flex;
          gap: var(--space-2xl);
          justify-content: center;
          flex-wrap: wrap;
          animation: slideUp 0.5s ease 0.4s forwards;
          opacity: 0;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .feature-icon {
          font-size: 1.5rem;
        }

        .feature-label {
          color: var(--text-secondary);
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .hero {
            padding-top: 100px;
          }

          .hero-features {
            gap: var(--space-lg);
          }
        }
      `}</style>
        </section>
    );
}
