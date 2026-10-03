import { execute, query } from "./db";
import { ensure } from "./api";
import {
  displayName,
  type Consultant,
  type Conversation,
  type Message,
  type User,
} from "./types";
import { credentials } from "./accounts";
import { validateImage } from "./records";
export async function consultantDirectory() {
  return query<Consultant>(
    "SELECT c.* FROM consultant c JOIN users_creds u ON u.user_ID=c.user_ID WHERE u.user_type='consultant' ORDER BY c.prof_name",
  );
}
export async function allowedConversation(
  user: User,
  consId: number,
  userId: number,
) {
  const consultant = (
    await query<Consultant>(
      "SELECT c.* FROM consultant c JOIN users_creds u ON u.user_ID=c.user_ID WHERE c.cons_ID=? AND u.user_type='consultant'",
      [consId],
    )
  )[0];
  const farmer = (
    await query<User>(
      "SELECT user_ID,user_name,fname,lname FROM users_creds WHERE user_ID=? AND user_type='client'",
      [userId],
    )
  )[0];
  ensure(consultant && farmer, 404, "Conversation not found.");
  ensure(
    (user.user_type === "client" && user.user_ID === userId) ||
      (user.user_type === "consultant" && consultant.user_ID === user.user_ID),
    403,
    "You do not have access to this conversation.",
  );
  if (user.user_type === "consultant")
    ensure(
      (
        await query(
          "SELECT msg_no FROM consultation WHERE cons_ID=? AND user_ID=? LIMIT 1",
          [consId, userId],
        )
      ).length,
      404,
      "Conversation not found.",
    );
  return { consultant, farmer };
}
export async function listConversations(user: User) {
  ensure(
    user.user_type !== "admin",
    403,
    "Consultations are available to farmers and consultants.",
  );
  const consultant =
    user.user_type === "consultant" ? await credentials(user) : null;
  if (user.user_type === "consultant" && !consultant) return [];
  return query<Conversation>(
    `SELECT m.user_ID,m.cons_ID,m.message,m.cons_date,
    ${user.user_type === "client" ? "c.prof_name" : "COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,''))),''),u.user_name)"} AS name,
    (SELECT COUNT(*) FROM consultation pending WHERE pending.user_ID=m.user_ID AND pending.cons_ID=m.cons_ID AND pending.tmp_ID=? AND pending.status='Unread') AS unread
    FROM consultation m JOIN consultant c ON c.cons_ID=m.cons_ID JOIN users_creds u ON u.user_ID=m.user_ID
    WHERE ${user.user_type === "client" ? "m.user_ID" : "m.cons_ID"}=? AND m.msg_no=(SELECT MAX(latest.msg_no) FROM consultation latest WHERE latest.user_ID=m.user_ID AND latest.cons_ID=m.cons_ID) ORDER BY m.msg_no DESC`,
    [
      user.user_type === "client" ? 2 : 1,
      user.user_type === "client" ? user.user_ID : consultant!.cons_ID,
    ],
  );
}
export async function getMessages(user: User, consId: number, userId: number) {
  const participants = await allowedConversation(user, consId, userId);
  const messages = await query<Message>(
    "SELECT * FROM consultation WHERE cons_ID=? AND user_ID=? ORDER BY msg_no",
    [consId, userId],
  );
  return { ...participants, messages };
}
export async function sendMessage(
  user: User,
  consId: number,
  userId: number,
  message: string,
  image?: string | null,
) {
  const { consultant, farmer } = await allowedConversation(
    user,
    consId,
    userId,
  );
  await validateImage(user, image);
  const fromFarmer = user.user_type === "client";
  const result = await execute(
    "INSERT INTO consultation(user_ID,cons_ID,tmp_ID,sent_to,sender,cons_date,message,pictu,status) VALUES (?,?,?,?,?,UTC_TIMESTAMP()+INTERVAL 8 HOUR,?,?,'Unread')",
    [
      userId,
      consId,
      fromFarmer ? 1 : 2,
      fromFarmer ? consultant.prof_name : displayName(farmer),
      fromFarmer ? displayName(user) : consultant.prof_name,
      message,
      image ?? null,
    ],
  );
  return result.insertId;
}
export async function markRead(user: User, consId: number, userId: number) {
  await allowedConversation(user, consId, userId);
  await execute(
    "UPDATE consultation SET status='Read' WHERE cons_ID=? AND user_ID=? AND tmp_ID=?",
    [consId, userId, user.user_type === "client" ? 2 : 1],
  );
}
