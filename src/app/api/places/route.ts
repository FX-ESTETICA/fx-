import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

// 声明 Edge Runtime，适配 Vercel 边缘节点计算与缓存
export const runtime = "edge";

type PlacesTextSearchRequest = {
  textQuery: string;
  maxResultCount: number;
  minRating?: number;
  locationBias: {
    circle: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
  rankPreference?: "DISTANCE" | "RELEVANCE";
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
  photos?: Array<{ name?: string }>;
};

type PlacesTextSearchResponse = {
  places?: GooglePlace[];
  error?: { message?: string };
};

// 将真实的 Google API 请求封装进 unstable_cache 中
const fetchGooglePlaces = unstable_cache(
  async (requestBody: any, apiKey: string) => {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const fieldMask = "places.id,places.displayName,places.rating,places.userRatingCount,places.businessStatus,places.location,places.photos";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify(requestBody)
    });

    const data = (await response.json()) as PlacesTextSearchResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || response.statusText);
    }

    return data;
  },
  ['google-places-search'], // 基础 cache key
  {
    revalidate: 86400, // 缓存 24 小时
    tags: ['places-search']
  }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const category = searchParams.get("category") || "all";
    const subCategory = searchParams.get("subCategory") || "all";
    const sortBy = searchParams.get("sortBy") || "POPULARITY";
    const searchQuery = searchParams.get("q") || "";

    const lat = latParam ? parseFloat(latParam) : undefined;
    const lng = lngParam ? parseFloat(lngParam) : undefined;

    if (!lat || !lng || !category) {
      return NextResponse.json(
        { error: "Missing required parameters (lat, lng, category)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY is not configured.");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 引擎选择器与参数构建
    let requestBody: PlacesTextSearchRequest | Record<string, unknown> = {};

    // 智能查询词构建 (Dynamic Query Formulation)
    let textQuery = "";

    // 构建核心意图词
    if (searchQuery) {
      textQuery = searchQuery;
    } else if (subCategory !== "all") {
      textQuery = subCategory;
    } else {
      // 映射大类意图 - 恢复极简、中性、高召回率的语义词
      const categoryMap: Record<string, { query: string }> = {
        dining: { query: "restaurants, cafes, food, bakeries, dining" },
        beauty: { query: "beauty salons, spas, hair care, nail salons, barbershop" },
        hotel: { query: "hotels, motels, resorts, lodging" },
        nightlife: { query: "nightclubs, nightlife, late night" },
        bar: { query: "bars, pubs, cocktail lounges, bistros" },
        fitness: { query: "gyms, fitness centers, yoga, pilates" },
        all: { query: "popular places, point of interest, things to do" }
      };
      
      const mapped = categoryMap[category] || categoryMap.all;
      textQuery = mapped.query;
    }

    // 组装 Payload
    requestBody = {
      textQuery: textQuery,
      maxResultCount: 20,
      // 移除 minRating: 4.0 斩杀线，全量召回
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 5000 // 扩大物理捞取圈至 5000 米
        }
      }
    };

    // 彻底废弃 includedType 限制，解决 "nail_salon" 等子类无法在大类中出现的物理隔离问题
    // if (includedType && subCategory === "all") { ... }

    // searchText 的排序策略
    if (sortBy === "DISTANCE") {
      requestBody.rankPreference = "DISTANCE";
    } else {
      requestBody.rankPreference = "RELEVANCE"; // RELEVANCE 综合考虑了评分、距离和语义匹配度
    }

    // 抹平经纬度精度，提高缓存命中率 (保留2位小数，约1公里级别的网格)
    const cacheLat = lat.toFixed(2);
    const cacheLng = lng.toFixed(2);
    // 生成基于参数的独立 Cache Key，供 unstable_cache 内部区分
    const queryCacheKey = `${textQuery}-${cacheLat}-${cacheLng}-${sortBy}`;

    // 使用 unstable_cache 包装的 fetch，传入额外的 key 供闭包内使用（这里实际上我们依赖 unstable_cache 的第二个参数数组，但在 Edge 环境下动态参数需要包裹）
    const data = await unstable_cache(
      async () => fetchGooglePlaces(requestBody, apiKey),
      ['google-places-search', queryCacheKey],
      { revalidate: 86400, tags: ['places-search'] }
    )();

    // Process and filter the results
    const places = (data.places || []).map((place) => ({
      id: place.id,
      name: place.displayName?.text || "Unknown Place",
      rating: place.rating || 0,
      user_ratings_total: place.userRatingCount || 0,
      status: place.businessStatus === "OPERATIONAL" ? "OPEN" : "CLOSED",
      category: category,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      photoName: place.photos?.[0]?.name || null
    }));

    // 突破 Google 黑盒：构建自主可控的真实好店综合排名算法
    // 计算两点之间距离的辅助函数 (Haversine)
    const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
      const R = 6371; 
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // 仅补充前端需要的 distanceKm 字段，移除本地强制截断
    const processedPlaces = places.map((p) => {
      const distanceKm = (p.lat !== undefined && p.lng !== undefined) ? getDistanceKm(lat, lng, p.lat, p.lng) : 999;
      return { ...p, distanceKm };
    });

    // 废弃魔改的 gxScore 算法，尊重 Google NLP 原生的相关性或距离排序
    // API 请求时已经通过 rankPreference 参数（DISTANCE 或 RELEVANCE）告诉了 Google
    // 这里只需根据前端的请求做一个兜底的简单排序保证
    if (sortBy === "DISTANCE") {
      processedPlaces.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === "RATING") {
      processedPlaces.sort((a, b) => b.rating - a.rating);
    }

    // 启用 Vercel Edge Cache 的 stale-while-revalidate 机制
    // s-maxage=3600 (CDN节点缓存1小时)
    // stale-while-revalidate=86400 (在24小时内，优先返回旧缓存并后台静默刷新)
    return NextResponse.json(
      { places: processedPlaces },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
