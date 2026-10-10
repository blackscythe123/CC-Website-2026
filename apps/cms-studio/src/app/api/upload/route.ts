import { NextRequest, NextResponse } from "next/server";
import { uploadImageToGitHub } from "@/lib/github";
import { getSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = getSessionToken(request);

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Security validation: allowed MIME types
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and SVG images are permitted." },
        { status: 400 }
      );
    }

    // Security validation: max file size (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 5MB size limit." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const url = await uploadImageToGitHub(token, sanitizedName, base64);

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Image upload failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
