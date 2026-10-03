import mysql from "mysql2/promise";
const email = process.argv[2];
if (!email)
  throw new Error("Pass the email of an existing registered account.");
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "monicrop",
});
try {
  await db.beginTransaction();
  const [users] = await db.query(
    "SELECT user_ID,email,user_type FROM users_creds ORDER BY user_ID FOR UPDATE",
  );
  if (users.some((user) => user.user_type === "admin"))
    throw new Error(
      "An administrator already exists. Use Accounts in Monicrop instead.",
    );
  const matches = users.filter(
    (user) => user.email.toLowerCase() === email.toLowerCase(),
  );
  if (matches.length !== 1)
    throw new Error(
      "Register an account with this email first. It must identify exactly one account.",
    );
  await db.execute("UPDATE users_creds SET user_type='admin' WHERE user_ID=?", [
    matches[0].user_ID,
  ]);
  await db.execute("DELETE FROM monicrop_sessions WHERE user_id=?", [
    matches[0].user_ID,
  ]);
  await db.commit();
  console.log("Administrator bootstrap complete. Sign in again.");
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
