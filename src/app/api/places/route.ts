import { NextResponse } from "next/server";

type PlacesTextSearchRequest = {
  textQuery: string;
  maxResultCount: number;
  minRating: number;
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      lat?: number;
      lng?: number;
      category?: string;
      subCategory?: string;
      sortBy?: "POPULARITY" | "DISTANCE" | "RATING" | string;
    };
    const { lat, lng, category, subCategory = "all", sortBy = "POPULARITY" } = body;

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
    let url = "";
    let requestBody: PlacesTextSearchRequest | Record<string, unknown> = {};
    const fieldMask = "places.id,places.displayName,places.rating,places.userRatingCount,places.businessStatus,places.location,places.photos";

    // 全量启用 searchText 引擎，进行语义化高精度检索
    url = "https://places.googleapis.com/v1/places:searchText";

    // 智能查询词构建 (Dynamic Query Formulation)
    let textQuery = "";

    // 构建核心意图词
    if (subCategory !== "all") {
      textQuery = `Best ${subCategory}`;
    } else {
      // 映射大类意图 - 放开 includedType 限制，完全拥抱语义搜索以避免误杀
      const categoryMap: Record<string, { query: string }> = {
        dining: { query: "Top rated restaurants, cafes, bakeries, and fine dining" },
        beauty: { query: "Top rated beauty salons, spas, hair care, and nail salons" },
        hotel: { query: "Best luxury hotels, resorts, and high-quality lodging" },
        nightlife: { query: "Top rated bars, nightclubs, and nightlife venues" },
        fitness: { query: "Best gyms, fitness centers, and yoga studios" },
        all: { query: "Top rated popular places and experiences" }
      };
      
      const mapped = categoryMap[category] || categoryMap.all;
      textQuery = mapped.query;
      // 移除 includedType 的刚性绑定，让 Google NLP 自己去理解并召回所有相关品类
    }

    // 组装 Payload
    // 回退到 locationBias 以兼容 searchText 引擎，避免 400 报错
    requestBody = {
      textQuery: textQuery,
      maxResultCount: 20,
      minRating: 4.0, // 黄金漏斗：斩杀线，只返回 4.0 分以上的优质店铺
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 3000 // 双轨制策略：扩大物理捞取圈至 3000 米，保证优质基数池
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
      console.error(`Google Places API Error (${subCategory === "all" ? "Nearby" : "Text"}):`, data.error?.message || response.statusText);
      return NextResponse.json(
        { error: data.error?.message || "Google API request failed" },
        { status: response.status }
      );
    }

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

    // 为每个 place 计算真理法庭 GX_Score 并执行内存级物理截断
    const GLOBAL_AVERAGE_RATING = 4.3;
    const CONFIDENCE_PRIOR = 50; // 信任基数：50 个评论
    
    // 1. 先计算距离并执行物理截断 (过滤掉 > 3000 米的放飞自我数据)
    const processedPlaces = places.map((p) => {
      const distanceKm = (p.lat !== undefined && p.lng !== undefined) ? getDistanceKm(lat, lng, p.lat, p.lng) : 999;
      return { ...p, distanceKm };
    }).filter((p) => p.distanceKm <= 3.0); // 绝对物理栅栏：只留 3km 内的

    // 2. 对留下来的“本地真实数据”进行真理法庭算分
    const placesWithScore = processedPlaces.map((p) => {
      const R = p.rating;
      const v = p.user_ratings_total;
      
      // 贝叶斯平滑评分
      const bayesianRating = (v * R + CONFIDENCE_PRIOR * GLOBAL_AVERAGE_RATING) / (v + CONFIDENCE_PRIOR);
      
      // 口碑基数对数收益
      const popularityBonus = v > 0 ? Math.log10(v) * 0.2 : 0;
      
      // 距离惩罚：双轨制分段惩罚
      const distanceKm = p.distanceKm;
      let distancePenalty = 0;
      if (distanceKm > 2.0) {
        distancePenalty = 0.5 + (distanceKm - 2.0) * 1.0; 
      } else if (distanceKm > 1.0) {
        distancePenalty = (distanceKm - 1.0) * 0.5;
      } else {
        distancePenalty = 0;
      }
      
      const gxScore = bayesianRating + popularityBonus - distancePenalty;
      
      return { ...p, gxScore };
    });

    // 排序路由拦截
    if (sortBy === "RATING") {
      placesWithScore.sort((a, b) => b.gxScore - a.gxScore);
    } else if (sortBy === "DISTANCE") {
      placesWithScore.sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      placesWithScore.sort((a, b) => b.gxScore - a.gxScore);
    }

    return NextResponse.json({ places: placesWithScore });
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
