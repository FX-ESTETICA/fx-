import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GX Core System',
    short_name: 'GX Core',
    description: 'GX - Galaxy Experience Access System',
    start_url: '/',
    display: 'fullscreen',
    background_color: '#000000',
    theme_color: '#00F2FF',
    icons: [],
  }
}
