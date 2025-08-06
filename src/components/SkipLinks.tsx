'use client';

import { useAccessibility } from '@/contexts/AccessibilityContext';

export default function SkipLinks() {
  const { skipToContent, skipToNavigation, settings } = useAccessibility();

  if (!settings.skipLinks) return null;

  return (
    <div className="skip-links">
      <button
        onClick={skipToContent}
        className="skip-link"
        onFocus={(e) => e.currentTarget.classList.add('visible')}
        onBlur={(e) => e.currentTarget.classList.remove('visible')}
      >
        Skip to main content
      </button>
      <button
        onClick={skipToNavigation}
        className="skip-link"
        onFocus={(e) => e.currentTarget.classList.add('visible')}
        onBlur={(e) => e.currentTarget.classList.remove('visible')}
      >
        Skip to navigation
      </button>
      
      <style jsx>{`
        .skip-links {
          position: absolute;
          top: -1000px;
          left: -1000px;
          z-index: 9999;
        }
        
        .skip-link {
          position: absolute;
          top: 0;
          left: 0;
          background: var(--primary);
          color: var(--primary-foreground);
          padding: 8px 16px;
          text-decoration: none;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transform: translateY(-100%);
          transition: transform 0.2s ease;
        }
        
        .skip-link:focus,
        .skip-link.visible {
          position: fixed;
          top: 10px;
          left: 10px;
          transform: translateY(0);
        }
        
        .skip-link:hover {
          background: var(--primary-hover);
        }
      `}</style>
    </div>
  );
}