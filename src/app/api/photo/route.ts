import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

export const runtime = "edge"; // 使用 Edge Runtime 以获得最佳的 CDN 缓存和代理性能

// 使用 unstable_cache 封装真正的 Google Fetch，提供底层的持久化缓存
const getGooglePhoto = unstable_cache(
  async (name: string, apiKey: string) => {
    // maxHeightPx=400 足以支撑首页卡片渲染，极大降低流量成本
    const url = `https://places.googleapis.com/v1/${name}/media?maxHeightPx=400&maxWidthPx=600&key=${apiKey}`;
    
    const response = await fetch(url, { redirect: "follow" });

    if (!response.ok) {
      throw new Error(`Failed to fetch photo from Google: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/jpeg";
    
    // 因为 unstable_cache 只能序列化 JSON，所以需要将 buffer 转为 base64
    const base64 = Buffer.from(buffer).toString('base64');
    
    return { base64, contentType };
  },
  ['google-places-photo'], // Cache Key
  { 
    revalidate: 2592000, // 在服务器端持久化缓存 30 天 (秒)
    tags: ['google-photo'] 
  }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    return new NextResponse("Missing photo name", { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new NextResponse("API key not configured", { status: 500 });
  }

  try {
    // 命中缓存时，不会发起真实的 Google API 请求
    const { base64, contentType } = await getGooglePhoto(name, apiKey);
    
    const buffer = Buffer.from(base64, 'base64');
    const headers = new Headers();
    
    // 透传 Content-Type
    headers.set("Content-Type", contentType);
    
    // 核心合规点：允许 30 天的性能缓存 (Caching for Performance)
    // s-maxage=2592000 表示在 CDN Edge 节点缓存 30 天
    headers.set("Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=86400");

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("Photo proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
