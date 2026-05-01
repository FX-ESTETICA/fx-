import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("place_id");
    const sessionToken = searchParams.get("sessionToken");

    if (!placeId) {
      return NextResponse.json({ error: "Missing place_id parameter" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY is not configured.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=zh-CN`;
    
    // 透传 SessionToken 给 Google (v1 API 必须在 query params 中传递 sessionToken)
    if (sessionToken) {
      url += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
      }
    });

    const data = await response.json();

    if (data.error) {
      console.error("Google Places Details API Error:", data.error);
      return NextResponse.json({ error: data.error.message || "Google API request failed" }, { status: 500 });
    }

    const result = {
      geometry: {
        location: {
          lat: data.location?.latitude,
          lng: data.location?.longitude
        }
      },
      name: data.displayName?.text || "",
      formatted_address: data.formattedAddress || ""
    };

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error fetching place details:", error);
    return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
  }
}
