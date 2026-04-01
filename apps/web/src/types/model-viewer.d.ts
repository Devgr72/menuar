import React from 'react';

// TypeScript declarations for @google/model-viewer web component
// Loaded via CDN in index.html

type ModelViewerHTMLProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;

interface ModelViewerAttributes {
  // Source
  src?: string;
  alt?: string;
  poster?: string;

  // AR
  ar?: boolean;
  'ar-modes'?: 'webxr' | 'scene-viewer' | 'quick-look' | string;
  'ar-scale'?: 'auto' | 'fixed';
  'ar-placement'?: 'floor' | 'wall';
  'ios-src'?: string;

  // Camera
  'camera-controls'?: boolean;
  'camera-orbit'?: string;
  'camera-target'?: string;
  'field-of-view'?: string;

  // Appearance
  'auto-rotate'?: boolean;
  'auto-rotate-delay'?: number;
  'shadow-intensity'?: string;
  'shadow-softness'?: string;
  exposure?: string;

  // Loading
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'interaction' | 'manual';

  // Interaction
  'disable-tap'?: boolean;
  'interaction-prompt'?: 'auto' | 'none';
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerHTMLProps & ModelViewerAttributes;
    }
  }
}

export {};
