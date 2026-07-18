import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#14181c',
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: '38px solid transparent',
          borderBottom: '38px solid transparent',
          borderLeft: '61px solid #3ec6e0',
          marginLeft: 11,
        }}
      />
    </div>,
    { ...size }
  );
}
