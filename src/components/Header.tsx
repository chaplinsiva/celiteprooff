'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Header Component
 * 
 * Main navigation header for CelitePro.
 * Features:
 * - Logo with gradient effect
 * - Navigation links
 * - Mobile responsive hamburger menu
 * - Glassmorphism styling
 */
export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/templates', label: 'Templates' },
        { href: '/pricing', label: 'Pricing' },
    ];

    return (
        <header className="header">
            <div className="header-container">
                {/* Logo */}
                <Link href="/" className="logo">
                    <span className="logo-icon">▶</span>
                    <span className="logo-text">Celite<span className="gradient-text">Pro</span></span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="nav-desktop">
                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="nav-link">
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* CTA Button */}
                <div className="header-actions">
                    <button className="btn btn-primary">
                        Get Started
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="menu-toggle"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </button>
            </div>

            {/* Mobile Navigation */}
            <nav className={`nav-mobile ${isMenuOpen ? 'open' : ''}`}>
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="nav-link"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {link.label}
                    </Link>
                ))}
                <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
                    Get Started
                </button>
            </nav>

            <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(10, 10, 15, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-primary);
        }

        .header-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: var(--space-md) var(--space-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 1.5rem;
          font-weight: 700;
          text-decoration: none;
        }

        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--accent-gradient);
          border-radius: var(--radius-md);
          font-size: 1rem;
        }

        .logo-text {
          color: var(--text-primary);
        }

        .nav-desktop {
          display: flex;
          gap: var(--space-xl);
        }

        .nav-link {
          color: var(--text-secondary);
          font-weight: 500;
          transition: color var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--text-primary);
        }

        .header-actions {
          display: flex;
          gap: var(--space-md);
        }

        .menu-toggle {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--space-sm);
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          gap: 5px;
          width: 24px;
        }

        .hamburger span {
          display: block;
          height: 2px;
          background: var(--text-primary);
          border-radius: 2px;
          transition: all var(--transition-fast);
        }

        .hamburger.open span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }

        .hamburger.open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.open span:nth-child(3) {
          transform: rotate(-45deg) translate(5px, -5px);
        }

        .nav-mobile {
          display: none;
          flex-direction: column;
          padding: var(--space-lg);
          gap: var(--space-md);
          border-top: 1px solid var(--border-primary);
        }

        .nav-mobile.open {
          display: flex;
        }

        @media (max-width: 768px) {
          .nav-desktop,
          .header-actions {
            display: none;
          }

          .menu-toggle {
            display: block;
          }
        }
      `}</style>
        </header>
    );
}
