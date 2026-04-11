import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const apiKey = process.env.BUNNY_STORAGE_API_KEY;
    const zoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE;

    if (!apiKey || !zoneName) {
      console.error("Bunny CDN credentials not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `studio/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;
    
    const uploadUrl = `https://storage.bunnycdn.com/${zoneName}/${filename}`;

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "AccessKey": apiKey,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: buffer,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Bunny CDN Upload Error:", text);
      return NextResponse.json({ error: "Failed to upload file to CDN" }, { status: 500 });
    }

    const url = `${cdnBase}/${filename}`;
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
