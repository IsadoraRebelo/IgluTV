import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#14181c',
        borderRadius: 96,
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: '110px solid transparent',
          borderBottom: '110px solid transparent',
          borderLeft: '176px solid #3ec6e0',
          marginLeft: 32,
        }}
      />
    </div>,
    { ...size }
  );
}
