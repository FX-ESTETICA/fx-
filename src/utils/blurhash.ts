import { encode } from 'blurhash';

/**
 * Blurhash 色彩占位符生成引擎 (带宽防爆核心)
 * 读取图片像素并生成极短的 Base83 字符串
 */
export const generateBlurhash = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // 必须设置 crossOrigin 以免跨域问题导致无法读取像素数据
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      // 降低计算分辨率以提速，生成缩略图的缩略图 (32x32)
      const width = 32;
      const height = Math.round(32 * (img.height / img.width));
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        return reject(new Error('无法获取 Canvas 2D Context'));
      }

      // 将原图绘制到缩小的画布上
      context.drawImage(img, 0, 0, width, height);

      // 提取 RGBA 像素数组
      const imageData = context.getImageData(0, 0, width, height);
      
      // 生成 Blurhash (4x3 的组件精度，够用且字符串极短)
      const hash = encode(
        imageData.data,
        imageData.width,
        imageData.height,
        4,
        3
      );
      resolve(hash);
    };

    img.onerror = () => {
      reject(new Error('Blurhash 生成失败：图片加载异常'));
    };
  });
};
