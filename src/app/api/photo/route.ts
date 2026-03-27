import { NextResponse } from "next/server";

export const runtime = "edge"; // 使用 Edge Runtime 以获得最佳的 CDN 缓存和代理性能

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

  // maxHeightPx=400 足以支撑首页卡片渲染，极大降低流量成本
  const url = `https://places.googleapis.com/v1/${name}/media?maxHeightPx=400&maxWidthPx=600&key=${apiKey}`;

  try {
    const response = await fetch(url, { redirect: "follow" });

    if (!response.ok) {
      return new NextResponse("Failed to fetch photo from Google", { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const headers = new Headers();
    
    // 透传 Content-Type
    headers.set("Content-Type", response.headers.get("Content-Type") || "image/jpeg");
    
    // 核心合规点：允许 30 天的性能缓存 (Caching for Performance)
    // s-maxage=2592000 表示在 CDN Edge 节点缓存 30 天
    headers.set("Cache-Control", "public, s-maxage=2592000, stale-while-revalidate=86400");

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("Photo proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
