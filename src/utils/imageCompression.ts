import imageCompression from 'browser-image-compression';

/**
 * 极限图片压缩引擎 (防爆盘核心)
 * 将任意大小的图片强行压缩至 100KB 以内，转换为 WebP 格式
 */
export async function compressChatImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.1, // 极限压缩：强制 100KB 以内 (0.1MB)
    maxWidthOrHeight: 1280, // 控制分辨率，保证清晰度与体积的平衡
    useWebWorker: true, // 使用多线程，防止阻塞 UI
    fileType: 'image/webp' as const, // 强制转换为体积最小的 WebP 格式
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    // 如果原图实在太小，可能会比压缩后更小，这里做个安全判断
    if (compressedFile.size > file.size && file.type === 'image/webp') {
       return file;
    }
    
    return compressedFile;
  } catch (error) {
    console.error('图片极限压缩失败:', error);
    throw error;
  }
}
