/**
 * Bunny.net URL 转换逻辑
 * 
 * 方案设计：
 * 1. 图片优化：使用 Bunny Optimizer。
 *    URL 格式：https://{pullzone}.b-cdn.net/{path}?width={w}&height={h}&quality={q}&format=webp
 * 2. 视频流：使用 Bunny Stream。
 *    URL 格式：https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
 */

const BUNNY_PULL_ZONE_URL = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || 'https://gx-plus.b-cdn.net';
const BUNNY_STREAM_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID;

export interface BunnyImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  crop?: 'fill' | 'fit' | 'thumb';
  format?: 'webp' | 'avif' | 'auto';
}

/**
 * 生成 Bunny Optimizer 优化后的图片 URL
 */
export function getBunnyImageUrl(path: string, options: BunnyImageOptions = {}) {
  // 1. 如果没有配置环境变量，且当前是本地开发环境，则直接返回原始路径
  // 这样即便没有开通 Bunny，也能看到本地图片
  const isDev = process.env.NODE_ENV === 'development';
  const hasConfig = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL;

  if (!hasConfig && isDev && !path.startsWith('http')) {
    return path;
  }

  // 2. 如果已经是完整 URL 且不是 Bunny CDN 的，则直接返回
  if (path.startsWith('http') && !path.includes('b-cdn.net')) {
    return path;
  }

  // 3. 正常拼接 Bunny CDN URL
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const baseUrl = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || 'https://gx-plus.b-cdn.net';
  const url = new URL(`${baseUrl}/${cleanPath}`);

  if (options.width) url.searchParams.set('width', options.width.toString());
  if (options.height) url.searchParams.set('height', options.height.toString());
  if (options.quality) url.searchParams.set('quality', options.quality.toString());
  if (options.crop) url.searchParams.set('crop', options.crop);
  
  // 强制使用 webp 或 avif 以获得更好的性能
  const format = options.format || 'webp';
  if (format !== 'auto') {
    url.searchParams.set('format', format);
  }

  return url.toString();
}

/**
 * 生成 Bunny Stream 嵌入播放器 URL
 */
export function getBunnyStreamUrl(videoId: string) {
  if (!BUNNY_STREAM_LIBRARY_ID) {
    console.warn('BUNNY_STREAM_LIBRARY_ID is not configured');
    return '';
  }
  return `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`;
}

/**
 * 生成视频封面图 URL (使用 Bunny Stream 的预生成封面)
 */
export function getBunnyVideoThumbnail(videoId: string) {
  if (!BUNNY_STREAM_LIBRARY_ID) return '';
  return `https://vz-7429188d-368.b-cdn.net/${videoId}/thumbnail.jpg`;
}
