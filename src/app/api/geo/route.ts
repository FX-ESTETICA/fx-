import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // 穹顶级零成本方案：直接白嫖 Vercel 边缘节点的物理 IP 解析头
  // 100% 免费，0 延迟，0 跨域问题，无任何调用频率限制
  const city = request.headers.get('x-vercel-ip-city');
  const lat = request.headers.get('x-vercel-ip-latitude');
  const lng = request.headers.get('x-vercel-ip-longitude');

  if (city) {
    return NextResponse.json({
      city: decodeURIComponent(city),
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      source: 'edge'
    });
  }

  // 本地开发兜底方案 (或者 Vercel 头缺失时)
  try {
    // 改用更宽松的 freeipapi 作为开发期备用，防止 429 报错
    const res = await fetch('https://freeipapi.com/api/json', { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        city: data.cityName || '未知城市',
        latitude: data.latitude,
        longitude: data.longitude,
        source: 'fallback'
      });
    }
  } catch (e) {
    console.warn("IP Fallback failed", e);
  }

  // 终极兜底：当所有网络都断开时的默认物理坐标 (例如：赛博之城 - 北京)
  return NextResponse.json({
    city: '北京',
    latitude: 39.9042,
    longitude: 116.4074,
    source: 'mock'
  });
}
