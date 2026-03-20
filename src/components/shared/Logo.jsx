/**
 * Logo.jsx — Unified Logo Component
 * Syncs the brand identity across all pages.
 */
import React from 'react';

export default function Logo({ size = 40, full = false, dark = false, style = {} }) {
  const filter = dark ? 'brightness(0) invert(1)' : 'none';
  const src = full ? '/paarthivi-logo.png' : '/paarthivi-icon.png';
  const alt = full ? 'Paarthivi Smart Learning' : 'Paarthivi';

  return (
    <img
      src={src}
      alt={alt}
      style={{
        height: size,
        width: full ? 'auto' : size,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        filter,
        ...style
      }}
    />
  );
}
