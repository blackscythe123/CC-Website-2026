import { NextRequest, NextResponse } from "next/server";
import { uploadImageToGitHub } from "@/lib/github";

export async function POST(request: NextRequest) {
  const token =
    request.cookies.get("cc_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const url = await uploadImageToGitHub(token, file.name, base64);

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Image upload failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
