import { randomBytes } from "node:crypto";
import { execute, query, transaction, userColumns } from "./db";
import { ensure } from "./api";
import { hashPassword } from "./security";
import type { User, Consultant } from "./types";
import {
  accountSchema,
  accountEditSchema,
  credentialSchema,
  profileSchema,
} from "./validation";
import { validateImage } from "./records";
import type { z } from "zod";
export async function checkEmail(email: string, exceptId = 0) {
  ensure(
    !(
      await query(
        "SELECT user_ID FROM users_creds WHERE LOWER(email)=LOWER(?) AND user_ID<>?",
        [email, exceptId],
      )
    ).length,
    409,
    "That email is already used by an account.",
  );
}
export async function createAccount(data: z.infer<typeof accountSchema>) {
  const hash = await hashPassword(data.password);
  return transaction(async (connection) => {
    // Lock existing users to serialize duplicate-email checks, including legacy rows without an email index.
    await query(
      "SELECT user_ID FROM users_creds ORDER BY user_ID FOR UPDATE",
      [],
      connection,
    );
    const matches = await query(
      "SELECT user_ID FROM users_creds WHERE LOWER(email)=LOWER(?)",
      [data.email],
      connection,
    );
    ensure(!matches.length, 409, "That email is already used by an account.");
    const result = await execute(
      "INSERT INTO users_creds(user_name,email,pass,user_type,fname,minitial,lname) VALUES (?,?,?,?,?,?,?)",
      [
        data.user_name,
        data.email,
        randomBytes(24).toString("hex"),
        data.user_type,
        data.fname,
        data.minitial,
        data.lname,
      ],
      connection,
    );
    await execute(
      "INSERT INTO monicrop_auth(user_id,password_hash) VALUES (?,?)",
      [result.insertId, hash],
      connection,
    );
    return result.insertId;
  });
}
export function adminOnly(user: User) {
  ensure(user.user_type === "admin", 403, "Administrator access is required.");
}
export async function account(id: number) {
  const result = (
    await query<User>(
      `SELECT ${userColumns} FROM users_creds WHERE user_ID=?`,
      [id],
    )
  )[0];
  ensure(result, 404, "Account not found.");
  return result;
}
export async function updateAccount(
  user: User,
  id: number,
  data: z.infer<typeof accountEditSchema>,
) {
  adminOnly(user);
  await account(id);
  ensure(
    id !== user.user_ID || data.user_type === "admin",
    409,
    "You cannot change your own administrator role.",
  );
  await checkEmail(data.email, id);
  const hash = data.password ? await hashPassword(data.password) : null;
  await transaction(async (connection) => {
    await query(
      "SELECT user_ID FROM users_creds ORDER BY user_ID FOR UPDATE",
      [],
      connection,
    );
    const old = (
      await query<User>(
        `SELECT ${userColumns} FROM users_creds WHERE user_ID=?`,
        [id],
        connection,
      )
    )[0];
    ensure(old, 404, "Account not found.");
    ensure(
      !(
        await query(
          "SELECT user_ID FROM users_creds WHERE LOWER(email)=LOWER(?) AND user_ID<>?",
          [data.email, id],
          connection,
        )
      ).length,
      409,
      "That email is already used by an account.",
    );
    if (old.user_type === "admin" && data.user_type !== "admin")
      ensure(
        (
          await query(
            "SELECT user_ID FROM users_creds WHERE user_type='admin'",
            [],
            connection,
          )
        ).length > 1,
        409,
        "Keep at least one administrator.",
      );
    await execute(
      "UPDATE users_creds SET user_name=?,email=?,user_type=?,fname=?,minitial=?,lname=? WHERE user_ID=?",
      [
        data.user_name,
        data.email,
        data.user_type,
        data.fname,
        data.minitial,
        data.lname,
        id,
      ],
      connection,
    );
    if (hash)
      await execute(
        "INSERT INTO monicrop_auth(user_id,password_hash) VALUES (?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)",
        [id, hash],
        connection,
      );
    if (hash || old.user_type !== data.user_type)
      await execute(
        "DELETE FROM monicrop_sessions WHERE user_id=?",
        [id],
        connection,
      );
  });
}
export async function deleteAccount(user: User, id: number) {
  adminOnly(user);
  ensure(user.user_ID !== id, 409, "You cannot delete your own account.");
  await transaction(async (connection) => {
    await query(
      "SELECT user_ID FROM users_creds ORDER BY user_ID FOR UPDATE",
      [],
      connection,
    );
    const target = (
      await query<User>(
        `SELECT ${userColumns} FROM users_creds WHERE user_ID=?`,
        [id],
        connection,
      )
    )[0];
    ensure(target, 404, "Account not found.");
    if (target.user_type === "admin")
      ensure(
        (
          await query(
            "SELECT user_ID FROM users_creds WHERE user_type='admin'",
            [],
            connection,
          )
        ).length > 1,
        409,
        "Keep at least one administrator.",
      );
    await execute(
      "DELETE m FROM consultation m LEFT JOIN consultant c ON c.cons_ID=m.cons_ID WHERE m.user_ID=? OR c.user_ID=?",
      [id, id],
      connection,
    );
    await execute("DELETE FROM users_creds WHERE user_ID=?", [id], connection);
  });
}
export async function updateProfile(
  user: User,
  data: z.infer<typeof profileSchema>,
) {
  await checkEmail(data.email, user.user_ID);
  await validateImage(user, data.profile_pic, user.profile_pic);
  const hash = data.password ? await hashPassword(data.password) : null;
  await transaction(async (connection) => {
    await query(
      "SELECT user_ID FROM users_creds ORDER BY user_ID FOR UPDATE",
      [],
      connection,
    );
    ensure(
      !(
        await query(
          "SELECT user_ID FROM users_creds WHERE LOWER(email)=LOWER(?) AND user_ID<>?",
          [data.email, user.user_ID],
          connection,
        )
      ).length,
      409,
      "That email is already used by an account.",
    );
    await execute(
      "UPDATE users_creds SET user_name=?,email=?,fname=?,minitial=?,lname=?,birthdate=?,phone=?,street=?,barangay=?,city=?,province=?,country=?,postal_code=?,profile_pic=? WHERE user_ID=?",
      [
        data.user_name,
        data.email,
        data.fname,
        data.minitial,
        data.lname,
        data.birthdate || null,
        data.phone,
        data.street,
        data.barangay,
        data.city,
        data.province,
        data.country,
        data.postal_code,
        data.profile_pic === undefined ? user.profile_pic : data.profile_pic,
        user.user_ID,
      ],
      connection,
    );
    if (hash) {
      await execute(
        "INSERT INTO monicrop_auth(user_id,password_hash) VALUES (?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)",
        [user.user_ID, hash],
        connection,
      );
      await execute(
        "DELETE FROM monicrop_sessions WHERE user_id=?",
        [user.user_ID],
        connection,
      );
    }
  });
}
export async function credentials(user: User) {
  return (
    (
      await query<Consultant>(
        "SELECT * FROM consultant WHERE user_ID=? ORDER BY cons_ID LIMIT 1",
        [user.user_ID],
      )
    )[0] ?? null
  );
}
export async function saveCredentials(
  user: User,
  data: z.infer<typeof credentialSchema>,
) {
  ensure(
    user.user_type === "consultant",
    403,
    "Consultant access is required.",
  );
  await transaction(async (connection) => {
    await query(
      "SELECT user_ID FROM users_creds WHERE user_ID=? FOR UPDATE",
      [user.user_ID],
      connection,
    );
    const current = (
      await query<Consultant>(
        "SELECT * FROM consultant WHERE user_ID=? ORDER BY cons_ID LIMIT 1",
        [user.user_ID],
        connection,
      )
    )[0];
    if (current)
      await execute(
        "UPDATE consultant SET prof_name=?,expertise=?,certificate=?,description=? WHERE user_ID=?",
        [...Object.values(data), user.user_ID],
        connection,
      );
    else
      await execute(
        "INSERT INTO consultant(prof_name,expertise,certificate,description,user_ID) VALUES (?,?,?,?,?)",
        [...Object.values(data), user.user_ID],
        connection,
      );
    await execute(
      "UPDATE users_creds SET prof_name=? WHERE user_ID=?",
      [data.prof_name, user.user_ID],
      connection,
    );
  });
}
