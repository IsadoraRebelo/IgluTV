import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IgluTV',
    short_name: 'IgluTV',
    description: 'IgluTV - Your personalized TV show tracker',
    start_url: '/',
    display: 'standalone',
    background_color: '#14181c',
    theme_color: '#14181c',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
