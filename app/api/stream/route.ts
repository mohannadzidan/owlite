import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_ROOTS = (process.env.MEDIA_ROOTS ?? "").split(",").filter(Boolean);

function isSafePath(filePath: string): boolean {
  if (ALLOWED_ROOTS.length === 0) return true;
  const resolved = path.resolve(filePath);
  return ALLOWED_ROOTS.some((root) => resolved.startsWith(path.resolve(root)));
}

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
};

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath) return new NextResponse("Missing path", { status: 400 });

  if (!isSafePath(filePath)) return new NextResponse("Forbidden", { status: 403 });

  if (!fs.existsSync(filePath)) return new NextResponse("File not found", { status: 404 });

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] ?? "application/octet-stream";

  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": contentType,
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    },
  });
}
