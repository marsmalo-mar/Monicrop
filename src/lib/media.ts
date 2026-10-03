import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ensure, HttpError } from "./api";
import { execute, query } from "./db";
import type { User } from "./types";
const maximum = 5 * 1024 * 1024;
export async function upload(request: Request, user: User) {
  ensure(request.body, 400, "Choose an image.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maximum + 8192) {
      await reader.cancel();
      throw new HttpError(413, "Images must be smaller than 5 MB.");
    }
    chunks.push(value);
  }
  const buffered = new Request(request.url, {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type") || "" },
    body: Buffer.concat(chunks),
  });
  const form = await buffered.formData();
  const file = form.get("file");
  ensure(
    file instanceof File && file.size > 0 && file.size <= maximum,
    422,
    "Choose a JPEG, PNG, or WebP image smaller than 5 MB.",
  );
  ensure(
    ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    422,
    "Use a JPEG, PNG, or WebP image.",
  );
  let output: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
      animated: false,
    });
    const metadata = await image.metadata();
    ensure(
      ["jpeg", "png", "webp"].includes(metadata.format || ""),
      422,
      "Use a JPEG, PNG, or WebP image.",
    );
    output = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(
      422,
      "This image could not be read. Choose another JPEG, PNG, or WebP image.",
    );
  }
  const filename = `${randomUUID()}.webp`;
  await mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
  await writeFile(path.join(process.cwd(), "uploads", filename), output, {
    flag: "wx",
  });
  const stored = `uploads/${filename}`;
  await execute("INSERT INTO monicrop_uploads(path,user_id) VALUES (?,?)", [
    stored,
    user.user_ID,
  ]);
  return { path: stored };
}
export async function serveMedia(user: User, stored: string | null) {
  ensure(
    stored &&
      /^(uploads|pics|profile)\/[a-zA-Z0-9_(). -]+\.(jpg|jpeg|png|webp)$/i.test(
        stored,
      ),
    404,
    "Image not found.",
  );
  const allowed = await query(
    `SELECT path FROM monicrop_uploads WHERE path=? AND user_id=?
    UNION ALL SELECT profile_pic FROM users_creds WHERE profile_pic=? AND (user_ID=? OR user_type='consultant')
    UNION ALL SELECT l.image FROM crop_log l JOIN crops c ON c.cropID=l.cropID WHERE l.image=? AND c.user_ID=?
    UNION ALL SELECT m.pictu FROM consultation m JOIN consultant c ON c.cons_ID=m.cons_ID WHERE m.pictu=? AND (m.user_ID=? OR c.user_ID=?)`,
    [
      stored,
      user.user_ID,
      stored,
      user.user_ID,
      stored,
      user.user_ID,
      stored,
      user.user_ID,
      user.user_ID,
    ],
  );
  ensure(allowed.length, 404, "Image not found.");
  try {
    const [folder, filename] = stored.split("/");
    const base =
      folder === "uploads"
        ? path.join(process.cwd(), "uploads")
        : folder === "pics"
          ? path.join(process.cwd(), "legacy", "pics")
          : path.join(process.cwd(), "legacy", "profile");
    const root = await realpath(base);
    const target = await realpath(path.join(base, filename));
    ensure(target.startsWith(root + path.sep), 404, "Image not found.");
    const bytes = await readFile(target);
    const ext = path.extname(target).toLowerCase();
    return new Response(bytes, {
      headers: {
        "Content-Type":
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
              ? "image/webp"
              : "image/jpeg",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    throw new HttpError(404, "Image not found.");
  }
}
