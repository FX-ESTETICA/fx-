import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input");

    if (!input) {
      return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY is not configured.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const url = 'https://places.googleapis.com/v1/places:autocomplete';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey
      },
      body: JSON.stringify({
        input,
        languageCode: 'zh-CN'
      })
    });
    
    const data = await response.json();

    if (data.error) {
      console.error("Google Places Autocomplete API Error:", data.error);
      return NextResponse.json({ error: data.error.message || "Google API request failed" }, { status: 500 });
    }

    const predictions = (data.suggestions || []).map((suggestion: any) => {
      const p = suggestion.placePrediction;
      return {
        place_id: p.placeId,
        description: p.text?.text || "",
        structured_formatting: {
          main_text: p.structuredFormat?.mainText?.text || "",
          secondary_text: p.structuredFormat?.secondaryText?.text || ""
        }
      };
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Error fetching places autocomplete:", error);
    return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 });
  }
}
