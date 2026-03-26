import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { lat, lng, category, subCategory = "all", radius = 5000 } = await req.json();

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
    let requestBody: any = {};
    const fieldMask = "places.id,places.displayName,places.rating,places.userRatingCount,places.businessStatus,places.location";

    // 1. 如果是“全部”或者没有特定二级分类，使用基础的 searchNearby 引擎
    if (subCategory === "all") {
      let includedTypes = ["restaurant", "cafe", "food"]; // default
      if (category === "beauty") includedTypes = ["beauty_salon", "hair_care", "spa"];
      else if (category === "hotel") includedTypes = ["lodging"];
      else if (category === "nightlife") includedTypes = ["bar", "night_club"];
      else if (category === "fitness") includedTypes = ["gym", "spa"];
      else if (category === "all") includedTypes = ["restaurant", "beauty_salon", "lodging", "bar", "gym"];

      url = "https://places.googleapis.com/v1/places:searchNearby";
      requestBody = {
        includedTypes: includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius
          }
        }
      };
    } 
    // 2. 如果存在二级分类，启用高级的 searchText 引擎 (支持语义和细分品类)
    else {
      url = "https://places.googleapis.com/v1/places:searchText";
      
      // 构建精准的文本查询，例如 "Sushi near [Lat, Lng]" 或直接传品类词让 Google NLP 解析
      // 我们直接传英文搜索词以确保最高命中率，Google 会自动根据坐标进行本地化搜索
      let textQuery = subCategory; 
      
      requestBody = {
        textQuery: textQuery,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius
          }
        }
      };
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

    const data = await response.json();

    if (!response.ok) {
      console.error(`Google Places API Error (${subCategory === "all" ? "Nearby" : "Text"}):`, data.error?.message || response.statusText);
      throw new Error(`Google API returned status: ${response.status}`);
    }

    // Process and filter the results
    const places = (data.places || []).map((place: any) => ({
      id: place.id,
      name: place.displayName?.text || "Unknown Place",
      rating: place.rating || 0,
      user_ratings_total: place.userRatingCount || 0,
      status: place.businessStatus === "OPERATIONAL" ? "OPEN" : "CLOSED",
      category: category,
      lat: place.location?.latitude,
      lng: place.location?.longitude
    }));

    return NextResponse.json({ places });
  } catch (error: any) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
