import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Bunny Stream 预签名直传 API (Server-side)
 * 前端调用此接口，获取签名后的直传 URL，然后前端直接将文件上传到 Bunny，不经过我们的服务器。
 * 这样可以节省服务器带宽，并支持 TUS 断点续传。
 */
export async function POST(request: Request) {
  try {
    const { title } = await request.json();

    const libraryId = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'Bunny Stream credentials are not configured.' }, { status: 500 });
    }

    // 1. 先在 Bunny 创建一个空视频对象 (分配一个 Video ID)
    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        title: title || 'UGC Video'
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('Failed to create video object in Bunny:', err);
      return NextResponse.json({ error: 'Failed to create video object' }, { status: 500 });
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid;

    // 2. 生成预签名用于前端 TUS 上传 (或者简单 PUT 上传)
    // 根据 Bunny 文档，TUS 签名认证：
    // Signature = SHA256(library_id + api_key + expiration_time + video_id)
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const signatureString = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    // 返回客户端需要的所有信息，用于拼装上传请求
    return NextResponse.json({
      libraryId,
      videoId,
      authorizationSignature: signature,
      authorizationExpire: expirationTime,
      uploadUrl: `https://video.bunnycdn.com/tusupload` // TUS endpoint
    });

  } catch (error) {
    console.error('Error generating Bunny Stream upload token:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
