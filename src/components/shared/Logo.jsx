/**
 * Logo.jsx — Arthavi Smart Learning
 * Uses the original Arthavi.png logo from public folder.
 *
 * Props:
 *   size  – pixel height of the logo image   (default 40)
 *   full  – show "Arthavi / Smart Learning" text beside the icon
 *   dark  – TRUE when placed on a dark background (sidebar, footer)
 *   style – extra container styles
 */
import React from 'react';

export default function Logo({ size = 40, full = false, dark = false, style = {} }) {
  const textColor = dark ? '#FFFFFF' : '#1A1A1A';
  const subColor  = dark ? 'rgba(255,255,255,.5)' : '#6B6B6B';
  // Logo PNG is 3:2 landscape — size sets the height, width scales proportionally
  const imgHeight = size;
  const imgWidth  = Math.round(size * 1.5);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, ...style }}>
      <img
        src="/arthavi-logo.png"
        alt="Arthavi"
        width={imgWidth}
        height={imgHeight}
        style={{ flexShrink: 0, display: 'block', objectFit: 'contain' }}
      />
      {full && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontFamily: "var(--sans, 'Poppins', sans-serif)",
            fontSize: size * 0.42,
            fontWeight: 700,
            color: textColor,
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
          }}>Arthavi</span>
          <span style={{
            fontFamily: "var(--sans, 'Inter', sans-serif)",
            fontSize: size * 0.19,
            fontWeight: 500,
            color: subColor,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            marginTop: 1,
          }}>Smart Learning</span>
        </div>
      )}
    </div>
  );
}
