import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GX Core System',
    short_name: 'GX Core',
    description: 'GX - Galaxy Experience Access System',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#00F2FF',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
