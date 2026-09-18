import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nics and Dan's Cub",
    short_name: 'Cub',
    description: 'A private pregnancy companion for Dani and Nico.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FBF7F0',
    theme_color: '#FBF7F0',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
