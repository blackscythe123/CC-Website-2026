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

    // Security validation: strictly raster web images only (NO SVG to prevent XSS, NO RAW camera formats)
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only standard web images (JPEG, PNG, WebP, GIF) under 5MB are permitted. SVGs and RAW camera formats are strictly forbidden." },
        { status: 400 }
      );
    }

    // Security validation: extension check
    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif are permitted." },
        { status: 400 }
      );
    }

    // Security validation: max file size (5MB ceiling to reject 50MB+ RAW dumps)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed image size is 5MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes verification
    const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isGif = buffer.length > 4 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    const isWebp = buffer.length > 12 && buffer.toString("utf8", 0, 4) === "RIFF" && buffer.toString("utf8", 8, 12) === "WEBP";

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      return NextResponse.json(
        { error: "Corrupted or forged image. Magic bytes do not match expected image signature." },
        { status: 400 }
      );
    }

    const base64 = buffer.toString("base64");
    const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const sanitizedName = `${safeBaseName}.${ext}`;
    const url = await uploadImageToGitHub(token, sanitizedName, base64);

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Image upload failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
