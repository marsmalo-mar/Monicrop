import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { execute, query, transaction, userColumns } from "./db";
import { hashPassword, verifyPassword } from "./security";
import type { User } from "./types";
const cookieName = "monicrop_session";
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sessions = await query<{ user_id: number }>(
    "SELECT user_id FROM monicrop_sessions WHERE token_hash=? AND expires_at>UTC_TIMESTAMP()",
    [tokenHash(token)],
  );
  if (!sessions[0]) return null;
  return (
    (
      await query<User>(
        `SELECT ${userColumns} FROM users_creds WHERE user_ID=?`,
        [sessions[0].user_id],
      )
    )[0] ?? null
  );
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function signIn(email: string, password: string) {
  const token = randomBytes(32).toString("hex");
  const user = await transaction(async (connection) => {
    // Serialize login with password/role changes so an old password cannot
    // create a session concurrently with a credential reset.
    const users = await query<User & { pass: string }>(
      `SELECT ${userColumns},pass FROM users_creds WHERE LOWER(email)=LOWER(?) FOR UPDATE`,
      [email],
      connection,
    );
    if (users.length !== 1) return null;
    const user = users[0];
    const auth = (
      await query<{ password_hash: string }>(
        "SELECT password_hash FROM monicrop_auth WHERE user_id=?",
        [user.user_ID],
        connection,
      )
    )[0];
    if (auth) {
      if (!(await verifyPassword(password, auth.password_hash))) return null;
    } else {
      const supplied = Buffer.from(password);
      const legacy = Buffer.from(user.pass);
      if (
        supplied.length !== legacy.length ||
        !timingSafeEqual(supplied, legacy)
      )
        return null;
      await execute(
        "INSERT INTO monicrop_auth(user_id,password_hash) VALUES (?,?)",
        [user.user_ID, await hashPassword(password)],
        connection,
      );
    }
    await execute(
      "INSERT INTO monicrop_sessions(token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY))",
      [tokenHash(token), user.user_ID],
      connection,
    );
    const { pass: legacyPassword, ...safeUser } = user;
    void legacyPassword;
    return safeUser;
  });
  if (!user) return null;
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 7 * 86400,
  });
  return user;
}
export async function signOut() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token)
    await execute("DELETE FROM monicrop_sessions WHERE token_hash=?", [
      tokenHash(token),
    ]);
  jar.delete(cookieName);
}
