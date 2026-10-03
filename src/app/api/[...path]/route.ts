import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { currentUser, signIn, signOut } from "@/lib/auth";
import {
  apiError,
  body,
  checkOrigin,
  ensure,
  HttpError,
  numericId,
} from "@/lib/api";
import { execute, query, userColumns } from "@/lib/db";
import { homeFor, type User } from "@/lib/types";
import {
  accountEditSchema,
  accountSchema,
  credentialSchema,
  cropSchema,
  loginSchema,
  logSchema,
  messageSchema,
  profileSchema,
  registerSchema,
} from "@/lib/validation";
import {
  adminOnly,
  account,
  createAccount,
  credentials,
  deleteAccount,
  saveCredentials,
  updateAccount,
  updateProfile,
} from "@/lib/accounts";
import { listCrops, ownCrop, ownLog, saveCrop, saveLog } from "@/lib/records";
import {
  consultantDirectory,
  getMessages,
  listConversations,
  markRead,
  sendMessage,
} from "@/lib/messages";
import { serveMedia, upload } from "@/lib/media";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function rateLimit(identity: string, maximum = 10) {
  const hash = createHash("sha256").update(identity).digest("hex");
  await execute(
    "INSERT INTO monicrop_login_attempts(identity_hash,attempts,reset_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE attempts=IF(reset_at<=UTC_TIMESTAMP(),1,attempts+1),reset_at=IF(reset_at<=UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),reset_at)",
    [hash],
  );
  const [bucket] = await query<{ attempts: number }>(
    "SELECT attempts FROM monicrop_login_attempts WHERE identity_hash=?",
    [hash],
  );
  ensure(
    bucket.attempts <= maximum,
    429,
    "Too many attempts. Try again in 15 minutes.",
  );
  return hash;
}
async function handle(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const [resource, rawId, subresource, rawSubId] = path;
    const method = request.method;
    const json = (data: unknown, status = 200) =>
      NextResponse.json(data, { status });
    if (method !== "GET") checkOrigin(request);
    if (resource === "status" && method === "GET" && path.length === 1) {
      await query("SELECT user_id FROM monicrop_auth LIMIT 1");
      return json({
        database: "connected",
        stack: "Next.js 16 / React 19 / XAMPP MySQL",
      });
    }
    if (resource === "auth" && method === "POST" && rawId === "login") {
      const data = await body(request, loginSchema);
      const bucket = await rateLimit(`login:${data.email.toLowerCase()}`);
      const user = await signIn(data.email, data.password);
      ensure(user, 401, "Email or password is incorrect.");
      await execute(
        "DELETE FROM monicrop_login_attempts WHERE identity_hash=?",
        [bucket],
      );
      return json({ user, redirect: homeFor(user.user_type) });
    }
    if (resource === "auth" && method === "POST" && rawId === "register") {
      await rateLimit("registration", 20);
      const data = await body(request, registerSchema);
      const id = await createAccount({
        ...data,
        user_type: "client",
        fname: "",
        minitial: "",
        lname: "",
      });
      return json({ id }, 201);
    }
    const user = await currentUser();
    ensure(user, 401, "Sign in to continue.");
    if (resource === "auth" && method === "POST" && rawId === "logout") {
      await signOut();
      return json({ ok: true });
    }
    if (resource === "me" && path.length === 1) {
      if (method === "GET")
        return json({
          user,
          credentials:
            user.user_type === "consultant" ? await credentials(user) : null,
        });
      if (method === "PATCH") {
        const data = await body(request, profileSchema);
        await updateProfile(user, data);
        return json({ ok: true, passwordChanged: !!data.password });
      }
    }
    if (resource === "credentials" && method === "PATCH") {
      await saveCredentials(user, await body(request, credentialSchema));
      return json({ ok: true });
    }
    if (resource === "uploads" && method === "POST")
      return json(await upload(request, user), 201);
    if (resource === "media" && method === "GET")
      return await serveMedia(
        user,
        new URL(request.url).searchParams.get("path"),
      );
    if (resource === "crops") {
      if (!rawId && method === "GET") return json(await listCrops(user));
      if (!rawId && method === "POST")
        return json(
          { id: await saveCrop(user, await body(request, cropSchema)) },
          201,
        );
      const id = numericId(rawId);
      if (subresource === "logs") {
        await ownCrop(user, id);
        if (!rawSubId && method === "GET")
          return json(
            await query(
              "SELECT * FROM crop_log WHERE cropID=? ORDER BY log_date DESC,logID DESC",
              [id],
            ),
          );
        if (!rawSubId && method === "POST")
          return json(
            { id: await saveLog(user, id, await body(request, logSchema)) },
            201,
          );
        const logId = numericId(rawSubId);
        const log = await ownLog(user, logId);
        ensure(log.cropID === id, 404, "Care log not found.");
        if (method === "PATCH")
          return json({
            id: await saveLog(user, id, await body(request, logSchema), logId),
          });
        if (method === "DELETE") {
          await execute("DELETE FROM crop_log WHERE logID=?", [logId]);
          return json({ ok: true });
        }
      } else if (!subresource) {
        if (method === "GET") return json(await ownCrop(user, id));
        if (method === "PATCH")
          return json({
            id: await saveCrop(user, await body(request, cropSchema), id),
          });
        if (method === "DELETE") {
          await ownCrop(user, id);
          await execute("DELETE FROM crops WHERE cropID=? AND user_ID=?", [
            id,
            user.user_ID,
          ]);
          return json({ ok: true });
        }
      }
    }
    if (resource === "accounts") {
      adminOnly(user);
      if (!rawId && method === "GET")
        return json(
          await query<User>(
            `SELECT ${userColumns} FROM users_creds ORDER BY user_ID DESC`,
          ),
        );
      if (!rawId && method === "POST")
        return json(
          { id: await createAccount(await body(request, accountSchema)) },
          201,
        );
      const id = numericId(rawId);
      if (method === "GET") return json(await account(id));
      if (method === "PATCH") {
        await updateAccount(user, id, await body(request, accountEditSchema));
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await deleteAccount(user, id);
        return json({ ok: true });
      }
    }
    if (resource === "consultants" && method === "GET") {
      ensure(user.user_type === "client", 403, "Farmer access is required.");
      return json(await consultantDirectory());
    }
    if (resource === "conversations") {
      if (!rawId && method === "GET")
        return json(await listConversations(user));
      const consId = numericId(rawId);
      const userId = numericId(subresource);
      if (method === "GET")
        return json(await getMessages(user, consId, userId));
      if (method === "POST" && rawSubId === "read") {
        await markRead(user, consId, userId);
        return json({ ok: true });
      }
      if (method === "POST" && !rawSubId) {
        const data = await body(request, messageSchema);
        return json(
          {
            id: await sendMessage(
              user,
              consId,
              userId,
              data.message,
              data.pictu,
            ),
          },
          201,
        );
      }
    }
    throw new HttpError(404, "This endpoint does not exist.");
  } catch (error) {
    return apiError(error);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
