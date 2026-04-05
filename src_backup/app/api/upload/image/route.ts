import { NextResponse } from 'next/server';

/**
 * Bunny Storage 图片上传 API (Server-side)
 * 由于 Bunny Storage (边缘存储) 目前不支持像 Stream 那样的预签名直传机制，
 * 因此图片上传需要经过我们的服务器中转 (Server-side proxy)。
 * 注意：这仅适用于较小的文件（如图片）。如果是大视频，必须使用上面的 Stream 预签名直传。
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string || 'ugc';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    const storageApiKey = process.env.BUNNY_STORAGE_API_KEY;
    const storageRegion = process.env.BUNNY_STORAGE_REGION || 'de'; // e.g., 'de', 'ny', 'sg'

    if (!storageZoneName || !storageApiKey) {
      return NextResponse.json({ error: 'Bunny Storage credentials are not configured.' }, { status: 500 });
    }

    // Bunny Storage API endpoint format: https://[region].storage.bunnycdn.com/[zone_name]/[path]/[filename]
    // If region is default (de - Falkenstein), the prefix is usually just storage.bunnycdn.com
    const regionPrefix = storageRegion === 'de' ? '' : `${storageRegion}.`;
    const storageUrl = `https://${regionPrefix}storage.bunnycdn.com`;
    
    // 生成一个唯一的文件名以避免覆盖
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const fullPath = `/${storageZoneName}/${path}/${uniqueFilename}`;
    const uploadEndpoint = `${storageUrl}${fullPath}`;

    // 将前端传来的 File 转换为 Buffer 上传给 Bunny
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadRes = await fetch(uploadEndpoint, {
      method: 'PUT',
      headers: {
        'AccessKey': storageApiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: buffer
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('Failed to upload image to Bunny Storage:', err);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    // 构建通过 CDN 访问的 URL (通过你的 Pull Zone 域名访问)
    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || `https://${storageZoneName}.b-cdn.net`;
    const fileUrl = `${cdnBase}/${path}/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: uniqueFilename
    });

  } catch (error) {
    console.error('Error uploading image to Bunny Storage:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
