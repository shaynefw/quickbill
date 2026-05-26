import { NextResponse } from "next/server";
import { requireUser, requireActiveOrg } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 512 * 1024; // 512KB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

export async function POST(request: Request) {
  const user = await requireUser();
  const org = await requireActiveOrg(user.id);

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Please upload a PNG, JPEG, GIF, WebP, or SVG image." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 512KB." },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  // Save to active org's logoUrl
  await prisma.organization.update({
    where: { id: org.id },
    data: { logoUrl: dataUrl },
  });

  return NextResponse.json({ url: dataUrl });
}
