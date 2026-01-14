// app/api/upload/route.ts
// app/api/upload/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif",
      "image/webp", "application/pdf"
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Type non autorisé" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET!;

    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("upload_preset", uploadPreset);
    cloudinaryForm.append("folder", "linkify");

    const resourceType = file.type === "application/pdf" ? "raw" : "image";

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: "POST", body: cloudinaryForm }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Cloudinary error:", err);
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      url: data.secure_url,
      public_id: data.public_id,
      bytes: data.bytes,
      format: data.format,
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
