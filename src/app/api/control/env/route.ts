import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const { token } = await request.json().catch(() => ({}));
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const envPath = join(process.cwd(), ".env.local");
  let content = "";
  try {
    content = await readFile(envPath, "utf-8");
  } catch {
    content = "";
  }

  const key = "PUTERJS_API_KEY";
  const regex = new RegExp(`^${key}=.*$`, "m");

  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${token}`);
  } else {
    content = content.trimEnd() + `\n${key}=${token}\n`;
  }

  await writeFile(envPath, content, "utf-8");

  return NextResponse.json({ ok: true, message: `${key} saved to .env.local` });
}
