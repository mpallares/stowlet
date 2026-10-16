import { ImageResponse } from 'next/og';
import { SITE_NAME, TAGLINE } from '@/config';

export const dynamic = 'force-static';
export const alt = `${SITE_NAME}: ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 96,
        background: '#0a0a0a',
        color: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="#c2410c" />
          <rect x="5" y="8" width="22" height="16" rx="3.5" stroke="#fff" strokeWidth="2" />
          <rect x="12" y="15" width="8" height="2.4" rx="1.2" fill="#fff" />
        </svg>
        <div style={{ fontSize: 56, fontWeight: 700 }}>{SITE_NAME}</div>
      </div>
      <div style={{ marginTop: 40, fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>
        {TAGLINE}
      </div>
      <div style={{ marginTop: 24, fontSize: 34, color: '#a3a3a3' }}>
        Folders, search and export for ChatGPT and Claude. Local-first.
      </div>
    </div>,
    size,
  );
}
